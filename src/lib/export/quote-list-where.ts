import { resolveListOwnerConstraint, type DataOwnerFilter } from "@/lib/access-policy";

export interface QuoteListFilterParams {
  keyword?: string;
  status?: string;
  customerId?: string;
  ownerId?: string;
  matchedOwnerIds?: string[];
  since?: string;
}

export interface QuoteListContext {
  tenantId: string;
  ownerFilter?: DataOwnerFilter | null;
}

export function buildExportQuoteListWhere(
  ctx: QuoteListContext,
  params: QuoteListFilterParams
): Record<string, unknown> {
  const where: Record<string, unknown> = { tenantId: ctx.tenantId };
  if (params.customerId) where.customerId = params.customerId;
  if (params.status) where.status = params.status;
  const ownerConstraint = resolveListOwnerConstraint(
    ctx.ownerFilter,
    params.ownerId,
    params.matchedOwnerIds,
  );
  if (ownerConstraint !== undefined) where.customer = { ownerId: ownerConstraint };
  if (params.since === "month") {
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    where.createdAt = { gte: monthStart };
  }
  if (params.keyword && !params.matchedOwnerIds?.length) {
    where.OR = [
      { quoteNo: { contains: params.keyword, mode: "insensitive" } },
      { customer: { companyName: { contains: params.keyword, mode: "insensitive" } } },
      { customer: { owner: { name: { contains: params.keyword, mode: "insensitive" } } } },
    ];
  }
  return where;
}
