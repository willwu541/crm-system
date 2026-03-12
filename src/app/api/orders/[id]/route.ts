import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const { id } = await params;
  const order = await prisma.order.findFirst({
    where: {
      id,
      ...(user.role === "SALES" ? { createdById: user.id } : {}),
    },
    include: {
      createdBy: { select: { name: true } },
      items: { orderBy: { sortOrder: "asc" }, include: { attachments: true } },
      attachments: { where: { orderItemId: null } },
      quoteLinks: true,
      _count: { select: { quotes: true } },
    },
  });

  if (!order) {
    return NextResponse.json({ error: "订单不存在" }, { status: 404 });
  }

  return NextResponse.json({ data: order });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const { id } = await params;

  const order = await prisma.order.findFirst({
    where: {
      id,
      ...(user.role === "SALES" ? { createdById: user.id } : {}),
    },
  });

  if (!order) {
    return NextResponse.json({ error: "订单不存在" }, { status: 404 });
  }

  try {
    const body = await request.json();
    const { status, mainStatus, productionMode, customerPaymentStatus, supplierPaymentStatus } = body;

    const data: Record<string, unknown> = {};
    if (status && ["DRAFT", "PUBLISHED", "CLOSED"].includes(status)) data.status = status;
    if (mainStatus && ["CONVERTED", "IN_PRODUCTION", "PENDING_SHIPMENT", "COMPLETED", "CANCELLED"].includes(mainStatus)) {
      data.mainStatus = mainStatus;
    }
    if (productionMode && ["SELF", "OUTSOURCE", "MIXED"].includes(productionMode)) {
      data.productionMode = productionMode;
    }
    if (customerPaymentStatus && ["UNPAID", "PARTIAL", "PAID"].includes(customerPaymentStatus)) {
      data.customerPaymentStatus = customerPaymentStatus;
    }
    if (supplierPaymentStatus && ["UNPAID", "PARTIAL", "PAID"].includes(supplierPaymentStatus)) {
      data.supplierPaymentStatus = supplierPaymentStatus;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "无有效更新" }, { status: 400 });
    }

    const updated = await prisma.order.update({
      where: { id },
      data: data as never,
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
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const { id } = await params;

  const order = await prisma.order.findFirst({
    where: {
      id,
      ...(user.role === "SALES" ? { createdById: user.id } : {}),
    },
  });

  if (!order) {
    return NextResponse.json({ error: "订单不存在" }, { status: 404 });
  }

  try {
    await prisma.$transaction(async (tx) => {
      if (order.opportunityId) {
        await tx.opportunity.update({
          where: { id: order.opportunityId },
          data: { status: "OPPORTUNITY" },
        });
      }
      await tx.order.delete({ where: { id } });
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Delete order error:", e);
    return NextResponse.json({ error: "删除失败" }, { status: 500 });
  }
}
