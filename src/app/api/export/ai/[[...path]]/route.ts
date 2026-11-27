import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { PROJECT_PROGRESS_MARKS } from "@/lib/export-constants";
import { buildExportCustomerListWhere } from "@/lib/export/customer-list-where";
import { buildExportLeadListWhere } from "@/lib/export/lead-list-where";
import {
  claimUnassignedExportProject,
  isProjectLifecycle,
  isProjectProgressMark,
  isProjectStage,
  projectAssignmentWhere,
  projectKeywordOrClauses,
  projectLifecycleWhere,
} from "@/lib/export/projects";
import { followUpDueWhere } from "@/lib/export/follow-up-due";
import { parseOptionalNumber, projectRangeWhere } from "@/lib/export/project-schedule-value";
import { projectActivityLabel } from "@/lib/export/project-activity-label";
import { sourceUpdatedWhere } from "@/lib/export/source-updated-at";
import { countryPrismaWhere } from "@/lib/export/countries";
import { projectStageLabel } from "@/lib/export-display-labels";
import { authorizeExportAiKey, type ExportAiBoss } from "@/lib/export/ai-api";
import { loadExportAiBoss } from "@/lib/export/ai-api-boss";
import { appendTimestampedNote, progressMarkActivityText } from "@/lib/export/ai-writes";
import {
  createAiContact,
  createAiCustomer,
  createAiLead,
  createAiProject,
  updateAiContact,
  updateAiCustomer,
  updateAiLead,
  updateAiProject,
} from "@/lib/export/ai-records";
import { findAssignableExportUser } from "@/lib/export/assignees";
import { LEAD_LIFECYCLE_ACTIVITY } from "@/lib/export/defer-development";
import { ExportLeadTakeError, assertLeadTaken, assignExportLead, takeExportLeadFromPool } from "@/lib/export/take-lead";

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

const progressBody = z.object({ progressMark: z.enum(PROJECT_PROGRESS_MARKS) }).strict();
const followBody = z.object({
  content: z.string().trim().min(1, "请填写跟进内容").max(4000, "跟进内容太长"),
}).strict();
const analysisBody = z.object({
  content: z.string().trim().min(1, "请填写分析").max(8000, "内容太长"),
}).strict();
const leadAssignBody = z.object({ userId: z.string().trim().min(1, "请选择要分配的人") }).strict();
const projectAssignBody = z.object({ ownerId: z.string().trim().min(1, "请选择要分配的人") }).strict();

export async function POST(request: NextRequest, context: { params: Promise<{ path?: string[] }> }) {
  const gate = await requireBoss(request);
  if ("error" in gate && gate.error) return gate.error;
  const { boss, tenantId } = gate as { boss: ExportAiBoss; tenantId: string };
  const { path = [] } = await context.params;
  const [resource, id, action] = path;
  if (path.length === 3 && action === "claim") {
    if (resource === "leads") return claimLead(tenantId, boss, id);
    if (resource === "projects") return claimProject(tenantId, boss, id);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求体无效" }, { status: 400 });
  }

  if (path.length === 1 && resource === "leads") return createAiLead(tenantId, body);
  if (path.length === 1 && resource === "projects") return createAiProject(tenantId, boss, body);
  if (path.length === 1 && resource === "customers") return createAiCustomer(tenantId, boss, body);
  if (path.length === 3 && resource === "customers" && action === "contacts") {
    return createAiContact(tenantId, id, body);
  }

  if (!id || !action || path.length !== 3) {
    return NextResponse.json({ error: "未知路径" }, { status: 404 });
  }

  if (resource === "leads" && action === "progress-mark") return markLead(tenantId, boss, id, body);
  if (resource === "projects" && action === "progress-mark") return markProject(tenantId, boss, id, body);
  if (resource === "leads" && action === "follow-ups") return followLead(tenantId, boss, id, body);
  if (resource === "projects" && action === "follow-ups") return followProject(tenantId, boss, id, body);
  if (resource === "customers" && action === "analysis") return writeCustomerAnalysis(tenantId, id, body);
  if (resource === "leads" && action === "assign") return assignLead(tenantId, boss, id, body);
  if (resource === "projects" && action === "assign") return assignProject(tenantId, boss, id, body);
  return NextResponse.json({ error: "未知路径" }, { status: 404 });
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ path?: string[] }> }) {
  const gate = await requireBoss(request);
  if ("error" in gate && gate.error) return gate.error;
  const { boss, tenantId } = gate as { boss: ExportAiBoss; tenantId: string };
  const { path = [] } = await context.params;
  const [resource, id, extra] = path;
  if (!id || extra || path.length !== 2) {
    return NextResponse.json({ error: "未知路径" }, { status: 404 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求体无效" }, { status: 400 });
  }
  if (resource === "leads") return updateAiLead(tenantId, boss, id, body);
  if (resource === "projects") return updateAiProject(tenantId, boss, id, body);
  if (resource === "customers") return updateAiCustomer(tenantId, id, body);
  if (resource === "contacts") return updateAiContact(tenantId, id, body);
  return NextResponse.json({ error: "未知路径" }, { status: 404 });
}

function parseProgress(body: unknown) {
  const parsed = progressBody.safeParse(body);
  if (!parsed.success) {
    const owns = body && typeof body === "object" && ("ownerId" in body || "assigneeId" in body);
    return {
      error: NextResponse.json(
        { error: owns ? "不能指定负责人" : "进度标记无效" },
        { status: 400 },
      ),
    };
  }
  return { progressMark: parsed.data.progressMark };
}

function parseNote(body: unknown, schema: typeof followBody | typeof analysisBody) {
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const owns = body && typeof body === "object" && ("ownerId" in body || "assigneeId" in body || "userId" in body);
    return {
      error: NextResponse.json(
        { error: owns ? "不能指定负责人" : parsed.error.issues[0]?.message ?? "参数错误" },
        { status: 400 },
      ),
    };
  }
  return { content: parsed.data.content };
}

async function assigneeOrError(tenantId: string, userId: string) {
  const assignee = await findAssignableExportUser(tenantId, userId);
  if (!assignee) {
    return { error: NextResponse.json({ error: "只能分配给业务员或业务经理" }, { status: 400 }) };
  }
  const person = await prisma.user.findUnique({
    where: { id: assignee.id },
    select: { id: true, name: true },
  });
  if (!person) {
    return { error: NextResponse.json({ error: "只能分配给业务员或业务经理" }, { status: 400 }) };
  }
  return { person };
}

async function markLead(tenantId: string, boss: ExportAiBoss, id: string, body: unknown) {
  const parsed = parseProgress(body);
  if ("error" in parsed) return parsed.error;
  const lead = await prisma.exportLead.findFirst({
    where: { id, tenantId },
    select: { id: true, companyName: true, progressMark: true, ownerId: true },
  });
  if (!lead) return NextResponse.json({ error: "线索不存在" }, { status: 404 });
  if ((lead.progressMark ?? "") === parsed.progressMark) {
    return NextResponse.json({ data: { id: lead.id, progressMark: parsed.progressMark, unchanged: true } });
  }
  const activity = await prisma.$transaction(async (tx) => {
    await tx.exportLead.update({
      where: { id, tenantId },
      data: { progressMark: parsed.progressMark },
    });
    return tx.exportActivity.create({
      data: {
        tenantId,
        leadId: id,
        type: LEAD_LIFECYCLE_ACTIVITY,
        direction: "outbound",
        content: progressMarkActivityText(parsed.progressMark),
        customerNameSnapshot: lead.companyName,
        ownerId: boss.id,
      },
      select: { id: true, createdAt: true, ownerId: true },
    });
  });
  return NextResponse.json({
    data: {
      id: lead.id,
      progressMark: parsed.progressMark,
      activityId: activity.id,
      createdAt: activity.createdAt,
      authorId: activity.ownerId,
    },
  });
}

async function markProject(tenantId: string, boss: ExportAiBoss, id: string, body: unknown) {
  const parsed = parseProgress(body);
  if ("error" in parsed) return parsed.error;
  const project = await prisma.exportProject.findFirst({
    where: { id, tenantId },
    select: { id: true, progressMark: true, ownerId: true },
  });
  if (!project) return NextResponse.json({ error: "项目不存在" }, { status: 404 });
  if ((project.progressMark ?? "") === parsed.progressMark) {
    return NextResponse.json({ data: { id: project.id, progressMark: parsed.progressMark, unchanged: true } });
  }
  const activity = await prisma.$transaction(async (tx) => {
    await tx.exportProject.update({
      where: { id, tenantId },
      data: { progressMark: parsed.progressMark },
    });
    return tx.exportProjectActivity.create({
      data: {
        tenantId,
        projectId: id,
        userId: boss.id,
        kind: "progress",
        content: parsed.progressMark,
      },
      select: { id: true, createdAt: true, userId: true },
    });
  });
  return NextResponse.json({
    data: {
      id: project.id,
      progressMark: parsed.progressMark,
      activityId: activity.id,
      createdAt: activity.createdAt,
      authorId: activity.userId,
    },
  });
}

async function followLead(tenantId: string, boss: ExportAiBoss, id: string, body: unknown) {
  const parsed = parseNote(body, followBody);
  if ("error" in parsed) return parsed.error;
  const lead = await prisma.exportLead.findFirst({
    where: { id, tenantId },
    select: { id: true, companyName: true, ownerId: true },
  });
  if (!lead) return NextResponse.json({ error: "线索不存在" }, { status: 404 });
  const activity = await prisma.exportActivity.create({
    data: {
      tenantId,
      leadId: id,
      type: "other",
      direction: "outbound",
      content: parsed.content,
      customerNameSnapshot: lead.companyName,
      ownerId: boss.id,
    },
    select: { id: true, content: true, createdAt: true, ownerId: true },
  });
  return NextResponse.json({
    data: {
      id: lead.id,
      activityId: activity.id,
      content: activity.content,
      createdAt: activity.createdAt,
      authorId: activity.ownerId,
    },
  });
}

async function followProject(tenantId: string, boss: ExportAiBoss, id: string, body: unknown) {
  const parsed = parseNote(body, followBody);
  if ("error" in parsed) return parsed.error;
  const project = await prisma.exportProject.findFirst({
    where: { id, tenantId },
    select: { id: true },
  });
  if (!project) return NextResponse.json({ error: "项目不存在" }, { status: 404 });
  const activity = await prisma.exportProjectActivity.create({
    data: {
      tenantId,
      projectId: id,
      userId: boss.id,
      kind: "follow_up",
      content: parsed.content,
    },
    select: { id: true, content: true, createdAt: true, userId: true },
  });
  return NextResponse.json({
    data: {
      id: project.id,
      activityId: activity.id,
      content: activity.content,
      createdAt: activity.createdAt,
      authorId: activity.userId,
    },
  });
}

async function writeCustomerAnalysis(tenantId: string, id: string, body: unknown) {
  const parsed = parseNote(body, analysisBody);
  if ("error" in parsed) return parsed.error;
  const customer = await prisma.exportCustomer.findFirst({
    where: { id, tenantId },
    select: { id: true, aiAnalysis: true, notes: true, ownerId: true },
  });
  if (!customer) return NextResponse.json({ error: "客户不存在" }, { status: 404 });
  const aiAnalysis = appendTimestampedNote(customer.aiAnalysis, parsed.content, new Date());
  await prisma.exportCustomer.update({
    where: { id, tenantId },
    data: { aiAnalysis },
  });
  return NextResponse.json({
    data: {
      id: customer.id,
      aiAnalysis,
      notes: customer.notes,
    },
  });
}

async function claimLead(tenantId: string, boss: ExportAiBoss, id: string) {
  const current = await prisma.exportLead.findFirst({
    where: { id, tenantId },
    select: { id: true, ownerId: true, convertedToCustomerId: true },
  });
  if (!current) return NextResponse.json({ error: "线索不存在" }, { status: 404 });
  if (current.convertedToCustomerId) {
    return NextResponse.json({ error: "该线索已转化" }, { status: 400 });
  }
  if (current.ownerId && current.ownerId !== boss.id) {
    return NextResponse.json({ error: "这条线索已经有人在跟，请用分配修改" }, { status: 409 });
  }
  if (current.ownerId === boss.id) {
    return NextResponse.json({ data: { id, ownerId: boss.id, claimed: false } });
  }
  try {
    await prisma.$transaction(async (tx) => {
      const taken = await takeExportLeadFromPool(tx, {
        tenantId,
        leadId: id,
        user: { id: boss.id, role: boss.role },
      });
      assertLeadTaken(taken);
    });
    return NextResponse.json({ data: { id, ownerId: boss.id, claimed: true } });
  } catch (e) {
    if (e instanceof ExportLeadTakeError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    console.error("AI claim lead error:", e);
    return NextResponse.json({ error: "认领失败，请稍后重试" }, { status: 500 });
  }
}

async function claimProject(tenantId: string, boss: ExportAiBoss, id: string) {
  const result = await claimUnassignedExportProject({
    tenantId,
    projectId: id,
    user: { id: boss.id, role: boss.role },
  });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ data: { id, ownerId: boss.id, claimed: true } });
}

async function assignLead(tenantId: string, boss: ExportAiBoss, id: string, body: unknown) {
  const parsed = leadAssignBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "请选择要分配的人" }, { status: 400 });
  }
  const assignee = await assigneeOrError(tenantId, parsed.data.userId);
  if ("error" in assignee) return assignee.error;
  try {
    const lead = await prisma.$transaction(async (tx) => {
      const assigned = await assignExportLead(tx, {
        tenantId,
        leadId: id,
        assigneeId: assignee.person.id,
        assignedById: boss.id,
      });
      assertLeadTaken(assigned);
      return tx.exportLead.findFirst({
        where: { id, tenantId },
        select: { id: true, ownerId: true, owner: { select: { id: true, name: true } } },
      });
    });
    if (!lead) return NextResponse.json({ error: "线索不存在" }, { status: 404 });
    return NextResponse.json({
      data: {
        id: lead.id,
        ownerId: lead.ownerId,
        ownerName: lead.owner?.name ?? null,
        assignedById: boss.id,
      },
    });
  } catch (e) {
    if (e instanceof ExportLeadTakeError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    console.error("AI assign lead error:", e);
    return NextResponse.json({ error: "分配失败" }, { status: 500 });
  }
}

async function assignProject(tenantId: string, boss: ExportAiBoss, id: string, body: unknown) {
  const parsed = projectAssignBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "请选择要分配的人" }, { status: 400 });
  }
  const assignee = await assigneeOrError(tenantId, parsed.data.ownerId);
  if ("error" in assignee) return assignee.error;
  const project = await prisma.exportProject.findFirst({
    where: { id, tenantId },
    select: { id: true, ownerId: true },
  });
  if (!project) return NextResponse.json({ error: "项目不存在" }, { status: 404 });
  if (project.ownerId === assignee.person.id) {
    return NextResponse.json({
      data: {
        id: project.id,
        ownerId: project.ownerId,
        ownerName: assignee.person.name,
        unchanged: true,
      },
    });
  }
  const activity = await prisma.$transaction(async (tx) => {
    await tx.exportProject.update({
      where: { id, tenantId },
      data: { ownerId: assignee.person.id },
    });
    return tx.exportProjectActivity.create({
      data: {
        tenantId,
        projectId: id,
        userId: boss.id,
        kind: "assign",
        content: assignee.person.name,
      },
      select: { id: true, createdAt: true, userId: true },
    });
  });
  return NextResponse.json({
    data: {
      id: project.id,
      ownerId: assignee.person.id,
      ownerName: assignee.person.name,
      activityId: activity.id,
      createdAt: activity.createdAt,
      authorId: activity.userId,
    },
  });
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
      aiAnalysis: true,
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
      aiAnalysis: row.aiAnalysis,
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
      aiAnalysis: true,
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
      progressMark: true,
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
      progressMark: row.progressMark || "未标记",
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
      progressMark: true,
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
  const lifecycle = searchParams.get("lifecycle")?.trim();
  const ownerId = searchParams.get("ownerId")?.trim();
  const sourceUpdated = searchParams.get("sourceUpdated")?.trim();
  const followUpDue = searchParams.get("followUpDue")?.trim();
  const valueMin = parseOptionalNumber(searchParams.get("valueMin"));
  const valueMax = parseOptionalNumber(searchParams.get("valueMax"));
  const where: Record<string, unknown> = {
    tenantId,
    ...projectRangeWhere({ valueMin, valueMax, scheduleEndFrom: null, scheduleEndTo: null }),
  };
  const assignment = projectAssignmentWhere(unassigned ? "unassigned" : "", true);
  if (assignment) Object.assign(where, assignment);
  else if (ownerId) where.ownerId = ownerId;
  if (lifecycle) {
    if (!isProjectLifecycle(lifecycle)) return NextResponse.json({ error: "lifecycle 无效" }, { status: 400 });
    Object.assign(where, projectLifecycleWhere(lifecycle));
  }
  if (sourceUpdated) {
    const updatedWhere = sourceUpdatedWhere(sourceUpdated);
    if (!updatedWhere) return NextResponse.json({ error: "sourceUpdated 无效" }, { status: 400 });
    where.sourceUpdatedAt = updatedWhere;
  }
  if (followUpDue) {
    const dueWhere = followUpDueWhere(followUpDue);
    if (!dueWhere) return NextResponse.json({ error: "followUpDue 无效" }, { status: 400 });
    where.nextFollowUpAt = dueWhere;
  }
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
      projectValueWan: true,
      status: true,
      nextFollowUpAt: true,
      sourceUpdatedAt: true,
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
      projectValueWanNumber: row.projectValueWan,
      status: row.status,
      nextFollowUpAt: row.nextFollowUpAt,
      sourceUpdatedAt: row.sourceUpdatedAt,
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
      projectValueWan: true,
      status: true,
      ownerId: true,
      notes: true,
      productNeed: true,
      nextStep: true,
      nextFollowUpAt: true,
      feedbackDueAt: true,
      sourceUpdatedAt: true,
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
      activities: {
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: 30,
        select: {
          id: true,
          kind: true,
          content: true,
          createdAt: true,
          user: { select: { id: true, name: true } },
        },
      },
    },
  });
  if (!row) return NextResponse.json({ error: "项目不存在" }, { status: 404 });
  const { activities, projectValueWan, ...rest } = row;
  return NextResponse.json({
    data: {
      ...rest,
      stageLabel: projectStageLabel[row.stage] ?? row.stage,
      progressMark: row.progressMark || "未标记",
      projectValueWan: row.projectValueText,
      projectValueWanNumber: projectValueWan,
      activities: activities.map((item) => ({
        id: item.id,
        kind: item.kind,
        label: projectActivityLabel(item.kind, item.content),
        content: item.content,
        createdAt: item.createdAt,
        userName: item.user.name,
      })),
    },
  });
}
