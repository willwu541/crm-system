import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import path from "path";
import { createReadStream, statSync } from "fs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const filePath = request.nextUrl.searchParams.get("path");

  if (!filePath || !filePath.startsWith("/uploads/")) {
    return NextResponse.json({ error: "无效的文件路径" }, { status: 400 });
  }

  const link = await prisma.quoteLink.findUnique({
    where: { token },
    include: { order: { include: { attachments: true } } },
  });

  if (!link) {
    return NextResponse.json({ error: "链接无效或已失效" }, { status: 404 });
  }

  const itemAttachments = await prisma.orderAttachment.findMany({
    where: { orderId: link.orderId },
  });
  const allAttachments = [...link.order.attachments, ...itemAttachments];
  const att = allAttachments.find((a) => a.filePath === filePath);

  if (!att) {
    return NextResponse.json({ error: "文件不存在或无权访问" }, { status: 403 });
  }

  const fullPath = path.join(process.cwd(), "public", filePath.slice(1));
  const safePath = path.normalize(fullPath);
  if (!safePath.startsWith(path.join(process.cwd(), "public", "uploads"))) {
    return NextResponse.json({ error: "无效路径" }, { status: 400 });
  }

  try {
    const stat = statSync(safePath);
    if (!stat.isFile()) {
      return NextResponse.json({ error: "文件不存在" }, { status: 404 });
    }

    const fileName = att.fileName;
    const stream = createReadStream(safePath);

    return new NextResponse(stream, {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(fileName)}"`,
        "Content-Length": String(stat.size),
      },
    });
  } catch (e) {
    console.error("Download error:", e);
    return NextResponse.json({ error: "文件读取失败" }, { status: 500 });
  }
}
