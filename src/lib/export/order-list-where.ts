export interface OrderListFilterParams {
  keyword?: string;
  status?: string;
  customerId?: string;
  ownerId?: string;
  since?: string;
}

export interface OrderListContext {
  tenantId: string;
  ownerFilter?: { ownerId: string } | null;
}

export function buildExportOrderListWhere(
  ctx: OrderListContext,
  params: OrderListFilterParams
): Record<string, unknown> {
  const where: Record<string, unknown> = { tenantId: ctx.tenantId };
  if (params.customerId) where.customerId = params.customerId;
  if (params.ownerId) where.customer = { ownerId: params.ownerId };
  else if (ctx.ownerFilter) where.customer = { ownerId: ctx.ownerFilter.ownerId };
  if (params.status) {
    if (["unpaid", "partial_paid", "paid"].includes(params.status)) where.paymentStatus = params.status;
    else if (["pending", "in_production", "completed"].includes(params.status)) {
      where.productionStatus = params.status;
    } else if (["ready_to_ship", "shipped"].includes(params.status)) {
      where.shippingStatus = params.status;
    }
  }
  if (params.since === "month") {
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    where.createdAt = { gte: monthStart };
  }
  if (params.keyword) {
    where.OR = [
      { orderNo: { contains: params.keyword, mode: "insensitive" } },
      { customer: { companyName: { contains: params.keyword, mode: "insensitive" } } },
    ];
  }
  return where;
}
