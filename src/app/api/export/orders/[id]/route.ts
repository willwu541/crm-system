import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireExportSession } from "@/lib/export/auth";
import { deleteWithExportLog } from "@/lib/export/deletion-log";
import { z } from "zod";

async function getOrderOrError(id: string, tenantId: string, ownerFilter?: { ownerId: string }) {
  const order = await prisma.exportOrder.findUnique({
    where: { id, tenantId },
    include: {
      customer: true,
      quote: true,
      items: true,
    },
  });
  if (!order) return { order: null, error: NextResponse.json({ error: "订单不存在" }, { status: 404 }) };
  if (ownerFilter && order.customer.ownerId !== ownerFilter.ownerId) {
    return { order: null, error: NextResponse.json({ error: "无权限" }, { status: 403 }) };
  }
  return { order, error: null };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { ctx, error } = await requireExportSession();
  if (error) return error;
  const { id } = await params;
  const { order, error: err } = await getOrderOrError(id, ctx!.tenantId, ctx!.ownerFilter);
  if (err) return err;
  return NextResponse.json({ data: order });
}

const updateSchema = z.object({
  orderDate: z.string().optional(),
  currency: z.string().optional(),
  totalAmount: z.union([z.number(), z.string()]).optional().nullable(),
  paymentTerm: z.string().optional(),
  paymentStatus: z.string().optional(),
  productionStatus: z.string().optional(),
  shippingStatus: z.string().optional(),
  eta: z.string().optional().nullable(),
  actualShipDate: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { ctx, error } = await requireExportSession();
  if (error) return error;
  const { id } = await params;
  const { order, error: err } = await getOrderOrError(id, ctx!.tenantId, ctx!.ownerFilter);
  if (err) return err;

  try {
    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "参数错误" },
        { status: 400 }
      );
    }

    const data: Record<string, unknown> = { ...parsed.data };
    if (parsed.data.orderDate) data.orderDate = new Date(parsed.data.orderDate);
    if (parsed.data.totalAmount !== undefined) data.totalAmount = parsed.data.totalAmount != null ? Number(parsed.data.totalAmount) : null;
    if (parsed.data.eta !== undefined) data.eta = parsed.data.eta ? new Date(parsed.data.eta) : null;
    if (parsed.data.actualShipDate !== undefined) data.actualShipDate = parsed.data.actualShipDate ? new Date(parsed.data.actualShipDate) : null;

    const updated = await prisma.exportOrder.update({
      where: { id, tenantId: ctx!.tenantId },
      data,
      include: {
        customer: { select: { id: true, companyName: true, customerCode: true } },
        quote: { select: { id: true, quoteNo: true } },
      },
    });
    return NextResponse.json({ data: updated });
  } catch (e) {
    console.error("Update order error:", e);
    return NextResponse.json({ error: "更新失败" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, ctx, error } = await requireExportSession();
  if (error) return error;
  const { id } = await params;
  const { error: err } = await getOrderOrError(id, ctx!.tenantId, ctx!.ownerFilter);
  if (err) return err;

  const full = await prisma.exportOrder.findUnique({
    where: { id, tenantId: ctx!.tenantId },
    include: {
      customer: { select: { id: true, companyName: true, customerCode: true } },
      quote: { select: { id: true, quoteNo: true } },
      items: true,
    },
  });
  if (!full) return NextResponse.json({ error: "订单不存在" }, { status: 404 });

  try {
    await deleteWithExportLog({
      tenantId: ctx!.tenantId,
      entityType: "order",
      recordId: id,
      summary: `${full.orderNo} · ${full.customer.companyName}`,
      snapshot: full,
      deletedById: user!.id,
      deleteFn: (tx) => tx.exportOrder.delete({ where: { id, tenantId: ctx!.tenantId } }),
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Delete order error:", e);
    return NextResponse.json({ error: "删除失败" }, { status: 500 });
  }
}
