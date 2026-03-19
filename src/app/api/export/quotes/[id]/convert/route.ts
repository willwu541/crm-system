import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireExportSession } from "@/lib/export/auth";
import { generateOrderNo } from "@/lib/export/number-generator";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { ctx, error } = await requireExportSession();
  if (error) return error;
  const { id: quoteId } = await params;

  const quote = await prisma.exportQuote.findUnique({
    where: { id: quoteId, tenantId: ctx!.tenantId },
    include: { customer: true, items: { orderBy: { sortOrder: "asc" } } },
  });
  if (!quote) return NextResponse.json({ error: "报价不存在" }, { status: 404 });
  if (ctx!.ownerFilter && quote.customer.ownerId !== ctx!.ownerFilter.ownerId) {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }

  const existingOrder = await prisma.exportOrder.findFirst({
    where: { quoteId, tenantId: ctx!.tenantId },
  });
  if (existingOrder) {
    return NextResponse.json({ error: "该报价已转化为订单", orderId: existingOrder.id });
  }

  const orderNo = await generateOrderNo(ctx!.tenantId);
  const order = await prisma.$transaction(async (tx) => {
    const o = await tx.exportOrder.create({
      data: {
        tenantId: ctx!.tenantId,
        orderNo,
        customerId: quote.customerId,
        quoteId,
        orderDate: new Date(),
        currency: quote.currency,
        totalAmount: quote.totalAmount,
        paymentStatus: "unpaid",
        productionStatus: "pending",
        shippingStatus: "pending",
      },
      include: {
        customer: { select: { id: true, companyName: true, customerCode: true } },
        quote: { select: { id: true, quoteNo: true } },
      },
    });
    if (quote.items.length > 0) {
      await tx.exportOrderItem.createMany({
        data: quote.items.map((item, idx) => ({
          orderId: o.id,
          productType: item.productType,
          spec: item.spec,
          description: item.description,
          quantity: item.quantity,
          unit: item.unit,
          unitPrice: item.unitPrice,
          amount: item.amount,
          sortOrder: item.sortOrder,
        })),
      });
    }
    await tx.exportQuote.update({
      where: { id: quoteId },
      data: { status: "won", isWon: true },
    });
    await tx.exportCustomer.update({
      where: { id: quote.customerId },
      data: { status: "won", isWon: true },
    });
    return o;
  });

  const orderWithItems = await prisma.exportOrder.findUnique({
    where: { id: order.id },
    include: {
      customer: { select: { id: true, companyName: true, customerCode: true } },
      quote: { select: { id: true, quoteNo: true } },
      items: true,
    },
  });

  return NextResponse.json({ data: orderWithItems ?? order });
}
