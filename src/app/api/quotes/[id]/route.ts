import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

    const updated = await prisma.quote.update({
      where: { id },
      data: { status },
    });

    return NextResponse.json({ data: updated });
  } catch (e) {
    console.error("Update quote status error:", e);
    return NextResponse.json({ error: "更新失败" }, { status: 500 });
  }
}
