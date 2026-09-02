import { buildLeadPacePrismaWhere, type LeadPaceFilter } from "@/lib/export/lead-pace";
import { collectUniqueEmails, collectUniqueWhatsapps, leadChannelWhere } from "@/lib/export/contact-channel-filter";
import { daysAgo, endOfLocalDay, WHATSAPP_MAINTAIN_DAYS } from "@/lib/export/follow-up";
import { companyNameContainsWhere, companyNameTokenAndWhere } from "@/lib/search-text";

export interface LeadListFilterParams {
  keyword?: string;
  status?: string;
  country?: string;
  ownerId?: string;
  since?: string;
  pace?: string;
  sourceChannel?: string;
  channel?: string;
  filter?: string;
  normalizedCompanyIds?: string[];
}

export interface LeadListContext {
  tenantId: string;
  ownerFilter?: { ownerId: string } | null;
}

function pushAnd(where: Record<string, unknown>, clause: Record<string, unknown>) {
  const existing = where.AND;
  if (Array.isArray(existing)) {
    existing.push(clause);
  } else if (existing) {
    where.AND = [existing, clause];
  } else {
    where.AND = [clause];
  }
}

export function leadWhatsappFirstContactWhere(): Record<string, unknown> {
  const channel = leadChannelWhere("whatsapp");
  return {
    status: { not: "converted" },
    lastContactAt: null,
    AND: [...(channel ? [channel] : [])],
  };
}

export function leadWhatsappMaintainWhere(now = new Date()): Record<string, unknown> {
  const todayEnd = endOfLocalDay(now);
  const silentSince = daysAgo(WHATSAPP_MAINTAIN_DAYS, now);
  const channel = leadChannelWhere("whatsapp");
  return {
    status: { not: "converted" },
    lastContactAt: { not: null },
    AND: [
      ...(channel ? [channel] : []),
      {
        OR: [
          { nextFollowUpAt: null },
          { nextFollowUpAt: { lt: todayEnd } },
          { lastContactAt: { lt: silentSince } },
        ],
      },
    ],
  };
}

export function buildExportLeadListWhere(
  ctx: LeadListContext,
  params: LeadListFilterParams,
  now = new Date(),
): Record<string, unknown> {
  const where: Record<string, unknown> = { tenantId: ctx.tenantId };
  if (ctx.ownerFilter) where.ownerId = ctx.ownerFilter.ownerId;

  if (params.keyword) {
    if (params.country) where.country = { contains: params.country, mode: "insensitive" };
    const or: Record<string, unknown>[] = [
      companyNameContainsWhere(params.keyword),
      { email: { contains: params.keyword, mode: "insensitive" } },
      { phone: { contains: params.keyword, mode: "insensitive" } },
      { whatsapp: { contains: params.keyword, mode: "insensitive" } },
      { website: { contains: params.keyword, mode: "insensitive" } },
      { notes: { contains: params.keyword, mode: "insensitive" } },
      { sourceKeyword: { contains: params.keyword, mode: "insensitive" } },
    ];
    const tokenAnd = companyNameTokenAndWhere(params.keyword);
    if (tokenAnd) or.push(tokenAnd);
    if (params.normalizedCompanyIds?.length) {
      or.push({ id: { in: params.normalizedCompanyIds } });
    }
    pushAnd(where, { OR: or });
    return where;
  }

  if (params.ownerId && !ctx.ownerFilter) where.ownerId = params.ownerId;
  if (params.status) where.status = params.status;
  if (params.country) where.country = { contains: params.country, mode: "insensitive" };
  if (params.since === "week") {
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - 7);
    where.createdAt = { gte: weekStart };
  }
  if (params.sourceChannel === "__empty__") {
    pushAnd(where, { OR: [{ sourceChannel: null }, { sourceChannel: "" }] });
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

  if (params.filter === "whatsapp_first" || params.filter === "whatsapp_maintain") {
    const special =
      params.filter === "whatsapp_first"
        ? leadWhatsappFirstContactWhere()
        : leadWhatsappMaintainWhere(now);
    if (!params.status) where.status = special.status;
    else pushAnd(where, { status: special.status as Record<string, unknown> });
    if ("lastContactAt" in special) where.lastContactAt = special.lastContactAt;
    const extraAnd = special.AND;
    if (Array.isArray(extraAnd)) {
      for (const clause of extraAnd) {
        pushAnd(where, clause as Record<string, unknown>);
      }
    }
  }

  const channelWhere = leadChannelWhere(params.channel);
  if (channelWhere && params.filter !== "whatsapp_maintain" && params.filter !== "whatsapp_first") {
    pushAnd(where, channelWhere);
  }

  return where;
}

export function collectLeadEmails(leads: { email: string | null }[]): string[] {
  return collectUniqueEmails(leads.map((l) => l.email));
}

export function collectLeadWhatsapps(leads: { whatsapp: string | null }[]): string[] {
  return collectUniqueWhatsapps(leads.map((l) => l.whatsapp));
}
