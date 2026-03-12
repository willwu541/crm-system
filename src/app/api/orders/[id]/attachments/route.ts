import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
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

  try {
    const body = await request.json();
    const { fileName, filePath, fileSize, mimeType, orderItemId } = body;

    if (!fileName || !filePath) {
      return NextResponse.json({ error: "缺少文件信息" }, { status: 400 });
    }

    const att = await prisma.orderAttachment.create({
      data: {
        orderId,
        orderItemId: orderItemId || null,
        fileName,
        filePath,
        fileSize: fileSize ?? 0,
        mimeType: mimeType ?? "application/octet-stream",
      },
    });

    return NextResponse.json({ data: att });
  } catch (e) {
    console.error("Create attachment error:", e);
    return NextResponse.json({ error: "添加附件失败" }, { status: 500 });
  }
}
