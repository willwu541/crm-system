import { buildLeadPacePrismaWhere, type LeadPaceFilter } from "@/lib/export/lead-pace";

export interface LeadListFilterParams {
  keyword?: string;
  status?: string;
  country?: string;
  ownerId?: string;
  since?: string;
  pace?: string;
  sourceChannel?: string;
}

export interface LeadListContext {
  tenantId: string;
  ownerFilter?: { ownerId: string } | null;
}

export function buildExportLeadListWhere(
  ctx: LeadListContext,
  params: LeadListFilterParams
): Record<string, unknown> {
  const where: Record<string, unknown> = { tenantId: ctx.tenantId };
  if (params.ownerId) where.ownerId = params.ownerId;
  else if (ctx.ownerFilter) where.ownerId = ctx.ownerFilter.ownerId;
  if (params.status) where.status = params.status;
  if (params.country) where.country = { contains: params.country, mode: "insensitive" };
  if (params.since === "week") {
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 7);
    where.createdAt = { gte: weekStart };
  }
  if (params.sourceChannel === "__empty__") {
    where.AND = [{ OR: [{ sourceChannel: null }, { sourceChannel: "" }] }];
  } else if (params.sourceChannel) {
    where.sourceChannel = { equals: params.sourceChannel, mode: "insensitive" };
  }

  if (params.pace === "never" || params.pace === "due" || params.pace === "stuck") {
    const paceWhere = buildLeadPacePrismaWhere(params.pace as LeadPaceFilter, {
      status: where.status,
    });
    Object.assign(where, paceWhere);
    if ("AND" in paceWhere) delete where.status;
  }

  if (params.keyword) {
    const orList = [
      { companyName: { contains: params.keyword, mode: "insensitive" } },
      { email: { contains: params.keyword, mode: "insensitive" } },
      { phone: { contains: params.keyword, mode: "insensitive" } },
    ];
    if (Array.isArray(where.AND)) {
      (where.AND as unknown[]).push({ OR: orList });
    } else {
      where.OR = orList;
    }
  }

  return where;
}

export function collectLeadEmails(leads: { email: string | null }[]): string[] {
  const seen = new Set<string>();
  const emails: string[] = [];
  for (const l of leads) {
    const email = l.email?.trim();
    if (!email) continue;
    const key = email.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    emails.push(email);
  }
  return emails;
}
