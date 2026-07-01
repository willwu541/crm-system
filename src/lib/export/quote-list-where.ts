export interface QuoteListFilterParams {
  keyword?: string;
  status?: string;
  customerId?: string;
  ownerId?: string;
  since?: string;
}

export interface QuoteListContext {
  tenantId: string;
  ownerFilter?: { ownerId: string } | null;
}

export function buildExportQuoteListWhere(
  ctx: QuoteListContext,
  params: QuoteListFilterParams
): Record<string, unknown> {
  const where: Record<string, unknown> = { tenantId: ctx.tenantId };
  if (params.customerId) where.customerId = params.customerId;
  if (params.status) where.status = params.status;
  if (params.ownerId) where.customer = { ownerId: params.ownerId };
  else if (ctx.ownerFilter) where.customer = { ownerId: ctx.ownerFilter.ownerId };
  if (params.since === "month") {
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    where.createdAt = { gte: monthStart };
  }
  if (params.keyword) {
    where.OR = [
      { quoteNo: { contains: params.keyword, mode: "insensitive" } },
      { customer: { companyName: { contains: params.keyword, mode: "insensitive" } } },
    ];
  }
  return where;
}
