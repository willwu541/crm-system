import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildExportCustomerListWhere } from "@/lib/export/customer-list-where";
import { buildExportLeadListWhere } from "@/lib/export/lead-list-where";
import { isProjectProgressMark, isProjectStage, projectAssignmentWhere, projectKeywordOrClauses } from "@/lib/export/projects";
import { countryPrismaWhere } from "@/lib/export/countries";
import { projectStageLabel } from "@/lib/export-display-labels";
import { authorizeExportAiKey, type ExportAiBoss } from "@/lib/export/ai-api";
import { loadExportAiBoss } from "@/lib/export/ai-api-boss";

const DEFAULT_TENANT_SLUG = "default";

async function tenantIdFor(boss: ExportAiBoss) {
  if (boss.tenantId) return boss.tenantId;
  const tenant = await prisma.exportTenant.findUnique({ where: { slug: DEFAULT_TENANT_SLUG } });
  return tenant?.id ?? "";
}

async function requireBoss(request: NextRequest) {
  const auth = authorizeExportAiKey(request.headers.get("authorization"));
  if (!auth.ok) {
    return { error: NextResponse.json({ error: auth.error }, { status: auth.status }) };
  }
  const boss = await loadExportAiBoss();
  if (!boss) {
    return { error: NextResponse.json({ error: "没有可用的管理者账号" }, { status: 403 }) };
  }
  const tenantId = await tenantIdFor(boss);
  if (!tenantId) {
    return { error: NextResponse.json({ error: "未配置租户" }, { status: 403 }) };
  }
  return { boss, tenantId };
}

function flag(value: string | null) {
  return value === "1" || value === "true";
}

function takeLimit(value: string | null) {
  const n = Number(value ?? "20");
  if (!Number.isFinite(n)) return 20;
  return Math.min(50, Math.max(1, Math.floor(n)));
}

function slimActivity(row: {
  id: string;
  type: string;
  direction: string;
  subject: string | null;
  content: string | null;
  customerFeedback: string | null;
  outcome: string | null;
  createdAt: Date;
  owner: { id: string; name: string };
}) {
  return {
    id: row.id,
    type: row.type,
    direction: row.direction,
    subject: row.subject,
    content: row.content,
    customerFeedback: row.customerFeedback,
    outcome: row.outcome,
    createdAt: row.createdAt,
    ownerName: row.owner.name,
  };
}

const activityInclude = {
  orderBy: { createdAt: "desc" as const },
  take: 15,
  include: { owner: { select: { id: true, name: true } } },
};

export async function GET(request: NextRequest, context: { params: Promise<{ path?: string[] }> }) {
  const gate = await requireBoss(request);
  if ("error" in gate && gate.error) return gate.error;
  const { tenantId } = gate as { boss: ExportAiBoss; tenantId: string };
  const { path = [] } = await context.params;
  const [resource, id] = path;
  const { searchParams } = new URL(request.url);

  if (resource === "customers" && !id) return listCustomers(tenantId, searchParams);
  if (resource === "customers" && id) return customerDetail(tenantId, id);
  if (resource === "leads" && !id) return listLeads(tenantId, searchParams);
  if (resource === "leads" && id) return leadDetail(tenantId, id);
  if (resource === "projects" && !id) return listProjects(tenantId, searchParams);
  if (resource === "projects" && id) return projectDetail(tenantId, id);
  return NextResponse.json({ error: "未知路径" }, { status: 404 });
}

async function listCustomers(tenantId: string, searchParams: URLSearchParams) {
  const keyword = searchParams.get("keyword")?.trim() || undefined;
  const country = searchParams.get("country")?.trim() || undefined;
  const status = searchParams.get("status")?.trim() || searchParams.get("stage")?.trim() || undefined;
  const unassigned = flag(searchParams.get("unassigned"));
  const where = buildExportCustomerListWhere({ tenantId, ownerFilter: undefined }, {
    keyword,
    country,
    status,
  });
  if (unassigned) where.ownerId = null;

  const rows = await prisma.exportCustomer.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    take: takeLimit(searchParams.get("limit")),
    select: {
      id: true,
      companyName: true,
      country: true,
      status: true,
      ownerId: true,
      lastOutcome: true,
      lastFollowUpAt: true,
      owner: { select: { id: true, name: true } },
      contacts: {
        orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
        take: 1,
        select: { name: true, email: true, phone: true },
      },
    },
  });

  return NextResponse.json({
    data: rows.map((row) => ({
      id: row.id,
      companyName: row.companyName,
      contactName: row.contacts[0]?.name ?? null,
      email: row.contacts[0]?.email ?? null,
      phone: row.contacts[0]?.phone ?? null,
      country: row.country,
      ownerId: row.ownerId,
      ownerName: row.owner.name,
      lastAction: row.lastOutcome,
      lastActionAt: row.lastFollowUpAt,
      status: row.status,
      projectValueWan: null,
      progressMark: null,
    })),
  });
}

async function customerDetail(tenantId: string, id: string) {
  const row = await prisma.exportCustomer.findFirst({
    where: { id, tenantId },
    select: {
      id: true,
      companyName: true,
      country: true,
      city: true,
      website: true,
      status: true,
      ownerId: true,
      notes: true,
      lastOutcome: true,
      lastFollowUpAt: true,
      nextFollowUpAt: true,
      owner: { select: { id: true, name: true } },
      contacts: {
        orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
        select: { id: true, name: true, email: true, phone: true, whatsapp: true, title: true, isPrimary: true },
      },
      activities: activityInclude,
    },
  });
  if (!row) return NextResponse.json({ error: "客户不存在" }, { status: 404 });
  const { activities, ...rest } = row;
  return NextResponse.json({ data: { ...rest, activities: activities.map(slimActivity) } });
}

async function listLeads(tenantId: string, searchParams: URLSearchParams) {
  const keyword = searchParams.get("keyword")?.trim() || undefined;
  const country = searchParams.get("country")?.trim() || undefined;
  const status = searchParams.get("status")?.trim() || searchParams.get("stage")?.trim() || undefined;
  const unassigned = flag(searchParams.get("unassigned"));
  const boss = { id: "ai-boss", role: "ADMIN" as const };
  const where = buildExportLeadListWhere(
    { tenantId, user: boss, ownerFilter: undefined },
    { keyword, country, status, scope: unassigned ? "pool" : undefined },
  );
  if (unassigned) where.ownerId = null;

  const rows = await prisma.exportLead.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    take: takeLimit(searchParams.get("limit")),
    select: {
      id: true,
      companyName: true,
      country: true,
      status: true,
      ownerId: true,
      email: true,
      phone: true,
      lastOutcome: true,
      lastContactAt: true,
      owner: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json({
    data: rows.map((row) => ({
      id: row.id,
      companyName: row.companyName,
      contactName: null,
      email: row.email,
      phone: row.phone,
      country: row.country,
      ownerId: row.ownerId,
      ownerName: row.owner?.name ?? null,
      lastAction: row.lastOutcome,
      lastActionAt: row.lastContactAt,
      status: row.status,
      projectValueWan: null,
      progressMark: null,
    })),
  });
}

async function leadDetail(tenantId: string, id: string) {
  const row = await prisma.exportLead.findFirst({
    where: { id, tenantId },
    select: {
      id: true,
      companyName: true,
      country: true,
      city: true,
      website: true,
      status: true,
      ownerId: true,
      email: true,
      phone: true,
      whatsapp: true,
      notes: true,
      lastOutcome: true,
      lastContactAt: true,
      nextFollowUpAt: true,
      owner: { select: { id: true, name: true } },
      activities: activityInclude,
    },
  });
  if (!row) return NextResponse.json({ error: "线索不存在" }, { status: 404 });
  const { activities, ...rest } = row;
  return NextResponse.json({ data: { ...rest, activities: activities.map(slimActivity) } });
}

async function listProjects(tenantId: string, searchParams: URLSearchParams) {
  const keyword = searchParams.get("keyword")?.trim();
  const country = searchParams.get("country")?.trim();
  const stage = searchParams.get("stage")?.trim();
  const progressMark = searchParams.get("progressMark")?.trim();
  const unassigned = flag(searchParams.get("unassigned"));
  const where: Record<string, unknown> = { tenantId };
  const assignment = projectAssignmentWhere(unassigned ? "unassigned" : "", true);
  if (assignment) Object.assign(where, assignment);
  const countryWhere = countryPrismaWhere(country);
  if (countryWhere) where.AND = [countryWhere];
  if (stage) {
    if (!isProjectStage(stage)) return NextResponse.json({ error: "阶段无效" }, { status: 400 });
    where.stage = stage;
  }
  if (progressMark) {
    if (!isProjectProgressMark(progressMark)) {
      return NextResponse.json({ error: "进度标记无效" }, { status: 400 });
    }
    where.progressMark = progressMark;
  }
  if (keyword) where.OR = projectKeywordOrClauses(keyword);

  const rows = await prisma.exportProject.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    take: takeLimit(searchParams.get("limit")),
    select: {
      id: true,
      name: true,
      country: true,
      stage: true,
      progressMark: true,
      projectValueText: true,
      ownerId: true,
      notes: true,
      updatedAt: true,
      owner: { select: { id: true, name: true } },
      parties: {
        orderBy: { createdAt: "asc" },
        take: 1,
        select: { companyName: true, contactName: true, email: true, phone: true },
      },
    },
  });

  return NextResponse.json({
    data: rows.map((row) => ({
      id: row.id,
      companyName: row.parties[0]?.companyName ?? row.name,
      projectName: row.name,
      contactName: row.parties[0]?.contactName ?? null,
      email: row.parties[0]?.email ?? null,
      phone: row.parties[0]?.phone ?? null,
      country: row.country,
      ownerId: row.ownerId,
      ownerName: row.owner?.name ?? null,
      lastAction: null,
      lastActionAt: row.updatedAt,
      stage: row.stage,
      stageLabel: projectStageLabel[row.stage] ?? row.stage,
      progressMark: row.progressMark || "未标记",
      projectValueWan: row.projectValueText,
      status: null,
    })),
  });
}

async function projectDetail(tenantId: string, id: string) {
  const row = await prisma.exportProject.findFirst({
    where: { id, tenantId },
    select: {
      id: true,
      name: true,
      country: true,
      city: true,
      stage: true,
      progressMark: true,
      projectValueText: true,
      status: true,
      ownerId: true,
      notes: true,
      productNeed: true,
      nextStep: true,
      owner: { select: { id: true, name: true } },
      parties: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          role: true,
          companyName: true,
          contactName: true,
          email: true,
          phone: true,
          leadId: true,
        },
      },
    },
  });
  if (!row) return NextResponse.json({ error: "项目不存在" }, { status: 404 });
  const leadIds = row.parties.map((party) => party.leadId).filter((value): value is string => Boolean(value));
  const activities = leadIds.length
    ? await prisma.exportActivity.findMany({
        where: { tenantId, leadId: { in: leadIds } },
        ...activityInclude,
      })
    : [];
  return NextResponse.json({
    data: {
      ...row,
      stageLabel: projectStageLabel[row.stage] ?? row.stage,
      progressMark: row.progressMark || "未标记",
      projectValueWan: row.projectValueText,
      activities: activities.map(slimActivity),
    },
  });
}
