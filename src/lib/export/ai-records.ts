import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  CUSTOMER_STATUSES,
  LEAD_STATUSES,
  PROJECT_ABANDONED_STATUS,
  PROJECT_DEMAND_STATUSES,
  PROJECT_INDUSTRIES,
  PROJECT_PROGRESS_MARKS,
  PROJECT_STAGES,
  PROJECT_STATUSES,
  PROJECT_UNABANDON_STATUS,
} from "@/lib/export-constants";
import { nullifyBlankFields } from "@/lib/export/blank-to-null";
import { canonicalizeCountry } from "@/lib/export/countries";
import { exportDuplicateConflictBody, findExportDuplicate } from "@/lib/export/dedupe";
import {
  DEFER_MARK_TEXT,
  DEFER_UNMARK_TEXT,
  LEAD_LIFECYCLE_ACTIVITY,
  deferStatusChange,
} from "@/lib/export/defer-development";
import { parseFollowUpDate } from "@/lib/export/follow-up-due";
import { generateCustomerCode } from "@/lib/export/number-generator";
import { newExportLeadAssignment } from "@/lib/export/lead-pool";
import type { ExportAiBoss } from "@/lib/export/ai-api";

const MONEY_KEYS = [
  "projectValueText",
  "projectValueWan",
  "projectValueOriginal",
  "amount",
  "totalAmount",
  "unitPrice",
] as const;

const IDENTITY_KEYS = ["ownerId", "assigneeId", "userId"] as const;

const AI_LEAD_STATUSES = LEAD_STATUSES.filter((status) => status !== "converted") as unknown as [
  string,
  ...string[],
];
const AI_PROJECT_STATUSES = PROJECT_STATUSES.filter(
  (status) => status !== PROJECT_ABANDONED_STATUS,
) as unknown as [string, ...string[]];

/** 新建和修改不能借负责人字段冒充别人，不能改金额，不能标废弃。 */
export function rejectAiRecordBody(body: unknown): string | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) return "请求体无效";
  const record = body as Record<string, unknown>;
  if (IDENTITY_KEYS.some((key) => key in record)) return "不能指定负责人";
  if (MONEY_KEYS.some((key) => key in record)) return "不能改金额";
  if (record.status === PROJECT_ABANDONED_STATUS) return "不能废弃";
  return null;
}

function blocked(body: unknown) {
  const message = rejectAiRecordBody(body);
  if (!message) return null;
  return NextResponse.json({ error: message }, { status: 400 });
}

function invalid(error: z.ZodError) {
  return NextResponse.json({ error: error.issues[0]?.message ?? "参数错误" }, { status: 400 });
}

const followDate = z.string().trim().min(1).nullable().optional();

const leadWrite = z
  .object({
    companyName: z.string().trim().min(1, "请填写公司名称").optional(),
    website: z.string().optional().nullable(),
    country: z.string().optional().nullable(),
    city: z.string().optional().nullable(),
    address: z.string().optional().nullable(),
    customerType: z.string().optional().nullable(),
    sourceChannel: z.string().optional().nullable(),
    sourceKeyword: z.string().optional().nullable(),
    email: z.string().optional().nullable(),
    phone: z.string().optional().nullable(),
    whatsapp: z.string().optional().nullable(),
    linkedin: z.string().optional().nullable(),
    facebook: z.string().optional().nullable(),
    tiktok: z.string().optional().nullable(),
    mainBusiness: z.string().optional().nullable(),
    productInterest: z.string().optional().nullable(),
    priority: z.string().optional().nullable(),
    status: z.enum(AI_LEAD_STATUSES).optional(),
    resumeParked: z.literal(true).optional(),
    notes: z.string().optional().nullable(),
    fitEvidence: z.string().optional().nullable(),
    nextFollowUpAt: followDate,
  })
  .strict();

const projectWrite = z
  .object({
    name: z.string().trim().min(1, "请填写项目名称").optional(),
    country: z.string().optional().nullable(),
    city: z.string().optional().nullable(),
    location: z.string().optional().nullable(),
    industry: z.enum(PROJECT_INDUSTRIES).optional().nullable(),
    stage: z.enum(PROJECT_STAGES).optional(),
    productNeed: z.string().optional().nullable(),
    description: z.string().optional().nullable(),
    source: z.string().optional().nullable(),
    knownScope: z.string().optional().nullable(),
    nextStep: z.string().optional().nullable(),
    generalContractor: z.string().optional().nullable(),
    potentialBuyers: z.string().optional().nullable(),
    ownerOperator: z.string().optional().nullable(),
    demandStatus: z.enum(PROJECT_DEMAND_STATUSES).optional(),
    progressMark: z.enum(PROJECT_PROGRESS_MARKS).optional(),
    actualBuyerCompany: z.string().optional().nullable(),
    actualBuyerContact: z.string().optional().nullable(),
    purchaseProgress: z.string().optional().nullable(),
    status: z.enum(AI_PROJECT_STATUSES).optional(),
    resumeParked: z.literal(true).optional(),
    notes: z.string().optional().nullable(),
    nextFollowUpAt: followDate,
  })
  .strict();

const customerWrite = z
  .object({
    companyName: z.string().trim().min(1, "请填写公司名称").optional(),
    website: z.string().optional().nullable(),
    country: z.string().optional().nullable(),
    city: z.string().optional().nullable(),
    address: z.string().optional().nullable(),
    customerType: z.string().optional().nullable(),
    industry: z.string().optional().nullable(),
    sourceChannel: z.string().optional().nullable(),
    status: z.enum(CUSTOMER_STATUSES).optional(),
    notes: z.string().optional().nullable(),
    fitEvidence: z.string().optional().nullable(),
    nextFollowUpAt: followDate,
  })
  .strict();

const contactWrite = z
  .object({
    name: z.string().trim().min(1, "请填写联系人姓名").optional(),
    title: z.string().optional().nullable(),
    email: z.string().optional().nullable(),
    phone: z.string().optional().nullable(),
    whatsapp: z.string().optional().nullable(),
    linkedin: z.string().optional().nullable(),
    facebook: z.string().optional().nullable(),
    tiktok: z.string().optional().nullable(),
    language: z.string().optional().nullable(),
    isPrimary: z.boolean().optional(),
    notes: z.string().optional().nullable(),
  })
  .strict();

function readFollowUp(value: string | null | undefined, touched: boolean) {
  if (!touched) return { ok: true as const, value: undefined };
  const parsed = parseFollowUpDate(value);
  if (value && parsed === undefined) {
    return { ok: false as const, error: NextResponse.json({ error: "下次跟进日期无效" }, { status: 400 }) };
  }
  return { ok: true as const, value: parsed };
}

export async function createAiLead(tenantId: string, body: unknown) {
  const denied = blocked(body);
  if (denied) return denied;
  const parsed = leadWrite.safeParse(body);
  if (!parsed.success) return invalid(parsed.error);
  if (!parsed.data.companyName) {
    return NextResponse.json({ error: "请填写公司名称" }, { status: 400 });
  }
  const follow = readFollowUp(parsed.data.nextFollowUpAt, parsed.data.nextFollowUpAt !== undefined);
  if (!follow.ok) return follow.error;
  const duplicate = await findExportDuplicate({
    tenantId,
    companyName: parsed.data.companyName,
    website: parsed.data.website,
    email: parsed.data.email,
    phone: parsed.data.phone ?? parsed.data.whatsapp,
  });
  if (duplicate) {
    return NextResponse.json(exportDuplicateConflictBody(duplicate), { status: 400 });
  }
  const { nextFollowUpAt: _date, resumeParked: _resume, ...rest } = nullifyBlankFields(parsed.data);
  const assignment = newExportLeadAssignment();
  const lead = await prisma.exportLead.create({
    data: {
      ...rest,
      tenantId,
      companyName: parsed.data.companyName,
      ownerId: assignment.ownerId,
      claimedAt: assignment.claimedAt,
      status: parsed.data.status ?? "new",
      nextFollowUpAt: follow.value ?? undefined,
    },
    select: { id: true, companyName: true, ownerId: true, status: true, notes: true, nextFollowUpAt: true },
  });
  return NextResponse.json({ data: lead });
}

export async function updateAiLead(tenantId: string, boss: ExportAiBoss, id: string, body: unknown) {
  const denied = blocked(body);
  if (denied) return denied;
  const parsed = leadWrite.safeParse(body);
  if (!parsed.success) return invalid(parsed.error);
  const lead = await prisma.exportLead.findFirst({
    where: { id, tenantId },
    select: { id: true, companyName: true, website: true, email: true, phone: true, whatsapp: true, status: true, parkedFromStatus: true, convertedToCustomerId: true },
  });
  if (!lead) return NextResponse.json({ error: "线索不存在" }, { status: 404 });
  if (parsed.data.status === "parked" && lead.status === "converted") {
    return NextResponse.json({ error: "已转化的线索不能暂缓开发" }, { status: 400 });
  }
  const follow = readFollowUp(parsed.data.nextFollowUpAt, parsed.data.nextFollowUpAt !== undefined);
  if (!follow.ok) return follow.error;
  const { nextFollowUpAt: _date, resumeParked, status, ...rest } = nullifyBlankFields(parsed.data);
  const deferred = deferStatusChange({
    currentStatus: lead.status,
    parkedFromStatus: lead.parkedFromStatus,
    requestedStatus: resumeParked ? undefined : status,
    resume: resumeParked,
    allowed: LEAD_STATUSES,
    fallback: "new",
  });
  const data: Record<string, unknown> = { ...rest };
  if (deferred.status !== undefined) data.status = deferred.status;
  if (deferred.parkedFromStatus !== undefined) data.parkedFromStatus = deferred.parkedFromStatus;
  if (follow.value !== undefined) data.nextFollowUpAt = follow.value;
  const duplicate = await findExportDuplicate({
    tenantId,
    companyName: parsed.data.companyName ?? lead.companyName,
    website: parsed.data.website ?? lead.website,
    email: parsed.data.email ?? lead.email,
    phone: parsed.data.phone ?? parsed.data.whatsapp ?? lead.phone ?? lead.whatsapp,
    exclude: { leadId: id, linkedCustomerId: lead.convertedToCustomerId },
  });
  if (duplicate) {
    return NextResponse.json(exportDuplicateConflictBody(duplicate), { status: 400 });
  }
  const updated = await prisma.$transaction(async (tx) => {
    const row = await tx.exportLead.update({
      where: { id, tenantId },
      data,
      select: { id: true, companyName: true, ownerId: true, status: true, notes: true, nextFollowUpAt: true },
    });
    if (deferred.log) {
      await tx.exportActivity.create({
        data: {
          tenantId,
          leadId: id,
          type: LEAD_LIFECYCLE_ACTIVITY,
          direction: "inbound",
          content: deferred.log === "mark" ? DEFER_MARK_TEXT : DEFER_UNMARK_TEXT,
          customerNameSnapshot: row.companyName,
          ownerId: boss.id,
        },
      });
    }
    return row;
  });
  return NextResponse.json({ data: updated });
}

export async function createAiProject(tenantId: string, boss: ExportAiBoss, body: unknown) {
  const denied = blocked(body);
  if (denied) return denied;
  const parsed = projectWrite.safeParse(body);
  if (!parsed.success) return invalid(parsed.error);
  if (!parsed.data.name) {
    return NextResponse.json({ error: "请填写项目名称" }, { status: 400 });
  }
  const follow = readFollowUp(parsed.data.nextFollowUpAt, parsed.data.nextFollowUpAt !== undefined);
  if (!follow.ok) return follow.error;
  const project = await prisma.exportProject.create({
    data: {
      tenantId,
      name: parsed.data.name,
      country: canonicalizeCountry(parsed.data.country ?? "") || parsed.data.country?.trim() || null,
      city: parsed.data.city?.trim() || null,
      location: parsed.data.location?.trim() || null,
      industry: parsed.data.industry || null,
      stage: parsed.data.stage ?? "unknown",
      productNeed: parsed.data.productNeed?.trim() || null,
      description: parsed.data.description?.trim() || null,
      source: parsed.data.source?.trim() || null,
      knownScope: parsed.data.knownScope?.trim() || null,
      nextStep: parsed.data.nextStep?.trim() || null,
      generalContractor: parsed.data.generalContractor?.trim() || null,
      potentialBuyers: parsed.data.potentialBuyers?.trim() || null,
      ownerOperator: parsed.data.ownerOperator?.trim() || null,
      demandStatus: parsed.data.demandStatus,
      progressMark: parsed.data.progressMark,
      actualBuyerCompany: parsed.data.actualBuyerCompany?.trim() || null,
      actualBuyerContact: parsed.data.actualBuyerContact?.trim() || null,
      purchaseProgress: parsed.data.purchaseProgress?.trim() || null,
      status: parsed.data.status ?? "hunting",
      notes: parsed.data.notes?.trim() || null,
      nextFollowUpAt: follow.value ?? null,
      ownerId: null,
      createdById: boss.id,
    },
    select: { id: true, name: true, ownerId: true, status: true, notes: true, nextFollowUpAt: true, progressMark: true },
  });
  return NextResponse.json({ data: project });
}

export async function updateAiProject(tenantId: string, boss: ExportAiBoss, id: string, body: unknown) {
  const denied = blocked(body);
  if (denied) return denied;
  const parsed = projectWrite.safeParse(body);
  if (!parsed.success) return invalid(parsed.error);
  const project = await prisma.exportProject.findFirst({
    where: { id, tenantId },
    select: { id: true, status: true, parkedFromStatus: true, stage: true },
  });
  if (!project) return NextResponse.json({ error: "项目不存在" }, { status: 404 });
  const follow = readFollowUp(parsed.data.nextFollowUpAt, parsed.data.nextFollowUpAt !== undefined);
  if (!follow.ok) return follow.error;
  const { nextFollowUpAt: _date, resumeParked, status, name, country, ...rest } = parsed.data;
  const deferred = deferStatusChange({
    currentStatus: project.status,
    parkedFromStatus: project.parkedFromStatus,
    requestedStatus: resumeParked ? undefined : status,
    resume: resumeParked,
    allowed: PROJECT_STATUSES,
    fallback: PROJECT_UNABANDON_STATUS,
  });
  const data: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(rest)) {
    if (value === undefined) continue;
    data[key] = typeof value === "string" ? value.trim() || null : value;
  }
  if (name !== undefined) data.name = name;
  if (country !== undefined) {
    data.country = canonicalizeCountry(country ?? "") || country?.trim() || null;
  }
  if (deferred.status !== undefined) data.status = deferred.status;
  if (deferred.parkedFromStatus !== undefined) data.parkedFromStatus = deferred.parkedFromStatus;
  if (follow.value !== undefined) data.nextFollowUpAt = follow.value;
  const updated = await prisma.$transaction(async (tx) => {
    const row = await tx.exportProject.update({
      where: { id, tenantId },
      data,
      select: { id: true, name: true, ownerId: true, status: true, notes: true, nextFollowUpAt: true, progressMark: true },
    });
    if (deferred.log) {
      await tx.exportProjectActivity.create({
        data: {
          tenantId,
          projectId: id,
          userId: boss.id,
          kind: "status",
          content: deferred.log === "mark" ? DEFER_MARK_TEXT : DEFER_UNMARK_TEXT,
        },
      });
    }
    return row;
  });
  return NextResponse.json({ data: updated });
}

export async function createAiCustomer(tenantId: string, boss: ExportAiBoss, body: unknown) {
  const denied = blocked(body);
  if (denied) return denied;
  const parsed = customerWrite.safeParse(body);
  if (!parsed.success) return invalid(parsed.error);
  if (!parsed.data.companyName) {
    return NextResponse.json({ error: "请填写公司名称" }, { status: 400 });
  }
  const follow = readFollowUp(parsed.data.nextFollowUpAt, parsed.data.nextFollowUpAt !== undefined);
  if (!follow.ok) return follow.error;
  const duplicate = await findExportDuplicate({
    tenantId,
    companyName: parsed.data.companyName,
    website: parsed.data.website,
  });
  if (duplicate) {
    return NextResponse.json(exportDuplicateConflictBody(duplicate, boss), { status: 400 });
  }
  const customerCode = await generateCustomerCode(tenantId);
  const { nextFollowUpAt: _date, ...rest } = nullifyBlankFields(parsed.data);
  const customer = await prisma.exportCustomer.create({
    data: {
      ...rest,
      tenantId,
      customerCode,
      companyName: parsed.data.companyName,
      ownerId: boss.id,
      status: parsed.data.status ?? "to_develop",
      nextFollowUpAt: follow.value ?? undefined,
    },
    select: { id: true, companyName: true, ownerId: true, status: true, notes: true, nextFollowUpAt: true, customerCode: true },
  });
  return NextResponse.json({ data: customer });
}

export async function updateAiCustomer(tenantId: string, id: string, body: unknown) {
  const denied = blocked(body);
  if (denied) return denied;
  const parsed = customerWrite.safeParse(body);
  if (!parsed.success) return invalid(parsed.error);
  const customer = await prisma.exportCustomer.findFirst({
    where: { id, tenantId },
    select: { id: true, companyName: true, website: true },
  });
  if (!customer) return NextResponse.json({ error: "客户不存在" }, { status: 404 });
  const follow = readFollowUp(parsed.data.nextFollowUpAt, parsed.data.nextFollowUpAt !== undefined);
  if (!follow.ok) return follow.error;
  const duplicate = await findExportDuplicate({
    tenantId,
    companyName: parsed.data.companyName ?? customer.companyName,
    website: parsed.data.website ?? customer.website,
    exclude: { customerId: id },
  });
  if (duplicate) {
    return NextResponse.json(exportDuplicateConflictBody(duplicate), { status: 400 });
  }
  const { nextFollowUpAt: _date, ...rest } = nullifyBlankFields(parsed.data);
  const data: Record<string, unknown> = { ...rest };
  if (follow.value !== undefined) data.nextFollowUpAt = follow.value;
  const updated = await prisma.exportCustomer.update({
    where: { id, tenantId },
    data,
    select: { id: true, companyName: true, ownerId: true, status: true, notes: true, nextFollowUpAt: true },
  });
  return NextResponse.json({ data: updated });
}

export async function createAiContact(tenantId: string, customerId: string, body: unknown) {
  const denied = blocked(body);
  if (denied) return denied;
  const parsed = contactWrite.safeParse(body);
  if (!parsed.success) return invalid(parsed.error);
  if (!parsed.data.name) {
    return NextResponse.json({ error: "请填写联系人姓名" }, { status: 400 });
  }
  const customer = await prisma.exportCustomer.findFirst({
    where: { id: customerId, tenantId },
    select: { id: true },
  });
  if (!customer) return NextResponse.json({ error: "客户不存在" }, { status: 404 });
  if (parsed.data.isPrimary) {
    await prisma.exportContact.updateMany({
      where: { customerId, tenantId },
      data: { isPrimary: false },
    });
  }
  const contact = await prisma.exportContact.create({
    data: {
      ...nullifyBlankFields(parsed.data),
      tenantId,
      customerId,
      name: parsed.data.name,
      isPrimary: parsed.data.isPrimary ?? false,
    },
    select: { id: true, customerId: true, name: true, email: true, phone: true, notes: true, isPrimary: true },
  });
  return NextResponse.json({ data: contact });
}

export async function updateAiContact(tenantId: string, id: string, body: unknown) {
  const denied = blocked(body);
  if (denied) return denied;
  const parsed = contactWrite.safeParse(body);
  if (!parsed.success) return invalid(parsed.error);
  const contact = await prisma.exportContact.findFirst({
    where: { id, tenantId },
    select: { id: true, customerId: true },
  });
  if (!contact) return NextResponse.json({ error: "联系人不存在" }, { status: 404 });
  if (parsed.data.isPrimary) {
    await prisma.exportContact.updateMany({
      where: { customerId: contact.customerId, tenantId },
      data: { isPrimary: false },
    });
  }
  const updated = await prisma.exportContact.update({
    where: { id, tenantId },
    data: nullifyBlankFields(parsed.data),
    select: { id: true, customerId: true, name: true, email: true, phone: true, notes: true, isPrimary: true },
  });
  return NextResponse.json({ data: updated });
}
