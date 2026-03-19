import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createOpLog } from "@/lib/oplog";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const { id } = await params;

  const quote = await prisma.quote.findFirst({
    where: { id },
    include: { order: true },
  });

  if (!quote) {
    return NextResponse.json({ error: "报价不存在" }, { status: 404 });
  }

  if (user.role === "SALES" && quote.order.createdById !== user.id) {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { status } = body;

    if (!["PENDING", "PREFERRED", "SELECTED"].includes(status)) {
      return NextResponse.json({ error: "无效状态" }, { status: 400 });
    }

    const orderId = quote.orderId;

    await createOpLog({
      action: "修改报价",
      targetType: "quote",
      targetId: id,
      targetName: `${quote.supplierName} - 订单${quote.order.orderNo}`,
      userId: user.id,
      userName: user.name,
      details: `状态: ${quote.status} → ${status}`,
    });

    if (status === "SELECTED") {
      await prisma.$transaction([
        prisma.quote.updateMany({
          where: { orderId, id: { not: id } },
          data: { status: "PENDING" },
        }),
        prisma.quote.update({
          where: { id },
          data: { status: "SELECTED" },
        }),
        prisma.order.update({
          where: { id: orderId },
          data: {
            hasSelectedSupplier: true,
            selectedQuoteId: id,
          },
        }),
      ]);
    } else {
      await prisma.quote.update({
        where: { id },
        data: { status },
      });
      if (quote.status === "SELECTED") {
        await prisma.order.update({
          where: { id: orderId },
          data: { hasSelectedSupplier: false, selectedQuoteId: null },
        });
      }
    }

    const updated = await prisma.quote.findUnique({
      where: { id },
      include: { items: true },
    });

    return NextResponse.json({ data: updated });
  } catch (e) {
    console.error("Update quote status error:", e);
    return NextResponse.json({ error: "更新失败" }, { status: 500 });
  }
}
