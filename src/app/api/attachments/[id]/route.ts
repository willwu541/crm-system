import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const { id } = await params;

  const att = await prisma.orderAttachment.findFirst({
    where: { id },
    include: { order: true },
  });

  if (!att) {
    return NextResponse.json({ error: "附件不存在" }, { status: 404 });
  }

  if (user.role === "SALES" && att.order.createdById !== user.id) {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }

  await prisma.orderAttachment.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
