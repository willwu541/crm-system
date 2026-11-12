import { prisma } from "@/lib/prisma";
import { projectStageLabel } from "@/lib/export-display-labels";
import { progressMarkCounts, sumProjectValueWan } from "@/lib/export/manager-insights";

export async function loadManagerInsights(tenantId: string) {
  const projectWhere = { tenantId };
  const [unassignedLeadCount, unassignedProjectCount, markGroups, stageGroups, countryGroups, valueRows, recent] =
    await Promise.all([
      prisma.exportLead.count({ where: { tenantId, ownerId: null } }),
      prisma.exportProject.count({ where: { tenantId, ownerId: null } }),
      prisma.exportProject.groupBy({
        by: ["progressMark"],
        where: projectWhere,
        _count: { _all: true },
      }),
      prisma.exportProject.groupBy({
        by: ["stage"],
        where: projectWhere,
        _count: { _all: true },
      }),
      prisma.exportProject.groupBy({
        by: ["country"],
        where: projectWhere,
        _count: { _all: true },
      }),
      prisma.exportProject.findMany({
        where: projectWhere,
        select: { projectValueText: true },
      }),
      prisma.exportProject.findMany({
        where: projectWhere,
        orderBy: { updatedAt: "desc" },
        take: 12,
        select: {
          id: true,
          name: true,
          country: true,
          stage: true,
          progressMark: true,
          projectValueText: true,
          updatedAt: true,
          owner: { select: { name: true } },
        },
      }),
    ]);

  const value = sumProjectValueWan(valueRows.map((row) => row.projectValueText));
  const byStage = stageGroups
    .map((row) => ({
      stage: row.stage,
      label: projectStageLabel[row.stage] ?? row.stage,
      count: row._count._all,
    }))
    .sort((a, b) => b.count - a.count);
  const byCountry = countryGroups
    .map((row) => ({
      country: row.country?.trim() ? row.country : "未填国家",
      count: row._count._all,
    }))
    .sort((a, b) => b.count - a.count);

  return {
    unassignedLeadCount,
    unassignedProjectCount,
    progressMarks: progressMarkCounts(
      markGroups.map((row) => ({ mark: row.progressMark, count: row._count._all })),
    ),
    byStage,
    byCountry,
    value,
    recent: recent.map((row) => ({
      id: row.id,
      name: row.name,
      country: row.country?.trim() || "未填国家",
      stage: projectStageLabel[row.stage] ?? row.stage,
      progressMark: row.progressMark || "未标记",
      projectValueText: row.projectValueText,
      ownerName: row.owner?.name ?? "未分配",
      updatedAt: row.updatedAt.toISOString(),
    })),
  };
}

export type ManagerInsights = Awaited<ReturnType<typeof loadManagerInsights>>;
