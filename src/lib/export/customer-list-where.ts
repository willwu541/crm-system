export interface CustomerListFilterParams {
  keyword?: string;
  status?: string;
  country?: string;
  ownerId?: string;
  filter?: string;
}

export interface CustomerListContext {
  tenantId: string;
  ownerFilter?: { ownerId: string } | null;
}

export function buildExportCustomerListWhere(
  ctx: CustomerListContext,
  params: CustomerListFilterParams
): Record<string, unknown> {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const where: Record<string, unknown> = { tenantId: ctx.tenantId };
  if (params.ownerId) where.ownerId = params.ownerId;
  else if (ctx.ownerFilter) where.ownerId = ctx.ownerFilter.ownerId;
  if (params.status) where.status = params.status;
  if (params.filter === "today") {
    // 今日待跟进同时包含已逾期未跟进，避免需要手动翻找
    where.nextFollowUpAt = { lt: todayEnd };
    where.status = { notIn: ["won", "lost"] };
  }
  if (params.filter === "overdue") {
    where.status = { notIn: ["won", "lost"] };
    where.OR = [
      { lastFollowUpAt: { lt: sevenDaysAgo } },
      { lastFollowUpAt: null, createdAt: { lt: sevenDaysAgo } },
    ];
  }
  if (params.country) where.country = { contains: params.country, mode: "insensitive" };
  if (params.keyword) {
    where.OR = [
      { companyName: { contains: params.keyword, mode: "insensitive" } },
      { customerCode: { contains: params.keyword, mode: "insensitive" } },
    ];
  }
  return where;
}

/** 从联系人列表提取去重后的邮箱（保留首次出现的写法） */
export function collectUniqueEmails(
  contactsList: { email: string | null }[][]
): string[] {
  const seen = new Set<string>();
  const emails: string[] = [];
  for (const contacts of contactsList) {
    for (const c of contacts) {
      const email = c.email?.trim();
      if (!email) continue;
      const key = email.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      emails.push(email);
    }
  }
  return emails;
}
