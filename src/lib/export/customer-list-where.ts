import { customerChannelWhere, collectContactField } from "@/lib/export/contact-channel-filter";
import { daysAgo, endOfLocalDay, WHATSAPP_MAINTAIN_DAYS } from "@/lib/export/follow-up";
import { companyNameContainsWhere, companyNameTokenAndWhere } from "@/lib/search-text";

export interface CustomerListFilterParams {
  keyword?: string;
  status?: string;
  country?: string;
  ownerId?: string;
  filter?: string;
  channel?: string;
  /** 去标点后的公司名命中 id，由 API 层用 SQL 查出后传入 */
  normalizedCompanyIds?: string[];
}

export interface CustomerListContext {
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

export function customerWhatsappFirstContactWhere(): Record<string, unknown> {
  const channel = customerChannelWhere("whatsapp");
  return {
    status: { notIn: ["won", "lost"] },
    lastFollowUpAt: null,
    AND: [...(channel ? [channel] : [])],
  };
}

export function customerWhatsappMaintainWhere(now = new Date()): Record<string, unknown> {
  const todayEnd = endOfLocalDay(now);
  const silentSince = daysAgo(WHATSAPP_MAINTAIN_DAYS, now);
  const channel = customerChannelWhere("whatsapp");
  return {
    status: { notIn: ["won", "lost"] },
    lastFollowUpAt: { not: null },
    AND: [
      ...(channel ? [channel] : []),
      {
        OR: [
          { nextFollowUpAt: null },
          { nextFollowUpAt: { lt: todayEnd } },
          { lastFollowUpAt: { lt: silentSince } },
        ],
      },
    ],
  };
}

export function buildExportCustomerListWhere(
  ctx: CustomerListContext,
  params: CustomerListFilterParams,
  now = new Date(),
): Record<string, unknown> {
  const todayEnd = endOfLocalDay(now);
  const sevenDaysAgo = daysAgo(7, now);

  const where: Record<string, unknown> = { tenantId: ctx.tenantId };
  // 业务员始终只能看自己的；管理员搜公司名时不沿用上次选的业务员
  if (ctx.ownerFilter) where.ownerId = ctx.ownerFilter.ownerId;

  if (params.keyword) {
    if (params.country) where.country = { contains: params.country, mode: "insensitive" };
    const or: Record<string, unknown>[] = [
      companyNameContainsWhere(params.keyword),
      { customerCode: { contains: params.keyword, mode: "insensitive" } },
      { website: { contains: params.keyword, mode: "insensitive" } },
      {
        contacts: {
          some: {
            OR: [
              { name: { contains: params.keyword, mode: "insensitive" } },
              { email: { contains: params.keyword, mode: "insensitive" } },
              { phone: { contains: params.keyword, mode: "insensitive" } },
              { whatsapp: { contains: params.keyword, mode: "insensitive" } },
            ],
          },
        },
      },
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

  if (params.filter === "today") {
    // 今日待跟进同时包含已逾期未跟进，避免需要手动翻找
    where.nextFollowUpAt = { lt: todayEnd };
    if (!params.status) where.status = { notIn: ["won", "lost"] };
    else pushAnd(where, { status: { notIn: ["won", "lost"] } });
  }
  if (params.filter === "overdue") {
    if (!params.status) where.status = { notIn: ["won", "lost"] };
    else pushAnd(where, { status: { notIn: ["won", "lost"] } });
    pushAnd(where, {
      OR: [
        { lastFollowUpAt: { lt: sevenDaysAgo } },
        { lastFollowUpAt: null, createdAt: { lt: sevenDaysAgo } },
      ],
    });
  }
  if (params.filter === "whatsapp_first" || params.filter === "whatsapp_maintain") {
    const special =
      params.filter === "whatsapp_first"
        ? customerWhatsappFirstContactWhere()
        : customerWhatsappMaintainWhere(now);
    if (!params.status) where.status = special.status;
    else pushAnd(where, { status: special.status as Record<string, unknown> });
    if ("lastFollowUpAt" in special) where.lastFollowUpAt = special.lastFollowUpAt;
    const extraAnd = special.AND;
    if (Array.isArray(extraAnd)) {
      for (const clause of extraAnd) {
        pushAnd(where, clause as Record<string, unknown>);
      }
    }
  }

  const channelWhere = customerChannelWhere(params.channel);
  if (channelWhere && params.filter !== "whatsapp_maintain" && params.filter !== "whatsapp_first") {
    pushAnd(where, channelWhere);
  }

  return where;
}

/** 从联系人列表提取去重后的邮箱（保留首次出现的写法） */
export function collectUniqueEmails(
  contactsList: { email: string | null }[][],
): string[] {
  return collectContactField(contactsList, "email");
}

export function collectUniqueWhatsappsFromContacts(
  contactsList: { whatsapp: string | null }[][],
): string[] {
  return collectContactField(contactsList, "whatsapp");
}
