import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const { id: orderId } = await params;

  const order = await prisma.order.findFirst({
    where: {
      id: orderId,
      ...(user.role === "SALES" ? { createdById: user.id } : {}),
    },
  });
  if (!order) {
    return NextResponse.json({ error: "订单不存在" }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const sortBy = searchParams.get("sortBy") || "submittedAt";
  const sortOrder = searchParams.get("sortOrder") || "desc";

  const quotes = await prisma.quote.findMany({
    where: { orderId },
    include: {
      items: { include: { orderItem: true } },
    },
    orderBy:
      sortBy === "totalPrice"
        ? undefined
        : sortBy === "expectedDelivery"
          ? { expectedDelivery: sortOrder as "asc" | "desc" }
          : { submittedAt: sortOrder as "asc" | "desc" },
  });

  const orderItems = await prisma.orderItem.findMany({
    where: { orderId },
    orderBy: { sortOrder: "asc" },
  });

  const quotesWithTotal = quotes.map((q) => {
    const total = q.items.reduce(
      (sum, i) => sum + Number(i.price) * Number(i.orderItem.quantity),
      0
    );
    return { ...q, totalPrice: total };
  });

  if (sortBy === "totalPrice") {
    quotesWithTotal.sort((a, b) =>
      sortOrder === "asc"
        ? a.totalPrice - b.totalPrice
        : b.totalPrice - a.totalPrice
    );
  }

  return NextResponse.json({
    data: quotesWithTotal,
    orderItems,
  });
}
