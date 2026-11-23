import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireExportSession } from "@/lib/export/auth";
import { csvDownloadResponse } from "@/lib/export/csv";
import { canManageExportProjects } from "@/lib/export/projects";
import { buildProjectListOrderBy, buildProjectListWhere } from "@/lib/export/project-list-where";
import { displayGeneralContractor, displayOwnerOperator } from "@/lib/export/project-board";
import { parseProjectValueWan } from "@/lib/export/project-schedule-value";
import { formatSourceUpdatedAt } from "@/lib/export/source-updated-at";
import { formatShanghaiDate } from "@/lib/export/project-follow-up-due";
import { countryLabel } from "@/lib/export/countries";
import { displayLabel, projectStageLabel, projectStatusLabel } from "@/lib/export-display-labels";
import { prismaErrorToUserMessage } from "@/lib/prisma-user-message";

const EXPORT_LIMIT = 5000;

export async function GET(request: NextRequest) {
  const { user, ctx, error } = await requireExportSession();
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const where = buildProjectListWhere(
    { tenantId: ctx!.tenantId, userId: user!.id, manageAll: canManageExportProjects(user!) },
    searchParams,
  );

  try {
    const projects = await prisma.exportProject.findMany({
      where,
      orderBy: buildProjectListOrderBy(searchParams) as Prisma.ExportProjectOrderByWithRelationInput[],
      take: EXPORT_LIMIT,
      include: {
        owner: { select: { name: true } },
        parties: { select: { role: true, companyName: true } },
      },
    });

    const headers = [
      "项目号",
      "项目名称",
      "国家",
      "城市",
      "阶段",
      "金额(万元)",
      "完工时间",
      "负责人",
      "进度标记",
      "状态",
      "资料更新时间",
      "下次跟进",
      "业主",
      "总包",
      "钢格板相关建材",
    ];
    const rows = projects.map((p) => {
      const wan = p.projectValueWan ?? parseProjectValueWan(p.projectValueText);
      return [
        p.sourceProjectNumber,
        p.name,
        p.country ? countryLabel(p.country) : "",
        p.city,
        displayLabel(projectStageLabel, p.stage),
        wan != null ? String(wan) : "",
        p.scheduleEnd,
        p.owner?.name ?? "未分配",
        p.progressMark,
        displayLabel(projectStatusLabel, p.status),
        formatSourceUpdatedAt(p.sourceUpdatedAt),
        formatShanghaiDate(p.nextFollowUpAt),
        displayOwnerOperator(p, p.parties),
        displayGeneralContractor(p, p.parties),
        p.gratingRelatedElements,
      ];
    });

    return csvDownloadResponse(`projects_${formatShanghaiDate(new Date())}.csv`, headers, rows);
  } catch (e) {
    console.error("Export projects csv error:", e);
    return NextResponse.json({ error: prismaErrorToUserMessage(e, "导出项目失败") }, { status: 500 });
  }
}
