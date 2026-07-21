import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

const ALLOWED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/pjpeg",
  "image/png",
  "image/x-png",
  "image/gif",
  "application/zip",
];
const ALLOWED_EXT = /\.(pdf|jpg|jpeg|png|gif|zip)$/i;
const MAX_SIZE = 50 * 1024 * 1024; // 50MB

export async function POST(request: NextRequest) {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const orderId = formData.get("orderId") as string | null;
    const orderItemId = formData.get("orderItemId") as string | null;
    // 通用附件：entityType=lead|customer, entityId=具体id
    const entityType = formData.get("entityType") as string | null;
    const entityId = formData.get("entityId") as string | null;

    if (!file || file.size === 0) {
      return NextResponse.json({ error: "请选择文件" }, { status: 400 });
    }
    if (!orderId) {
      return NextResponse.json({ error: "缺少 orderId" }, { status: 400 });
    }

    const extOk = ALLOWED_EXT.test(file.name);
    const typeOk = !file.type || ALLOWED_TYPES.includes(file.type);
    if (!extOk && !typeOk) {
      return NextResponse.json(
        { error: "仅支持 pdf、jpg、png、gif、zip 格式" },
        { status: 400 }
      );
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "文件大小不能超过 50MB" }, { status: 400 });
    }

    // 构建目录：优先订单→通用实体
    let dir: string;
    let relativePath: string;
    
    if (orderId) {
      dir = orderItemId
        ? path.join(process.cwd(), "public", "uploads", orderId, "items", orderItemId)
        : path.join(process.cwd(), "public", "uploads", orderId);
    } else if (entityType && entityId) {
      dir = path.join(process.cwd(), "public", "uploads", entityType, entityId);
    } else {
      dir = path.join(process.cwd(), "public", "uploads", "general");
    }
    await mkdir(dir, { recursive: true });

    const ext = path.extname(file.name) || "";
    const safeName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
    const filePath = path.join(dir, safeName);
    
    if (orderId) {
      relativePath = orderItemId
        ? `uploads/${orderId}/items/${orderItemId}/${safeName}`
        : `uploads/${orderId}/${safeName}`;
    } else if (entityType && entityId) {
      relativePath = `uploads/${entityType}/${entityId}/${safeName}`;
    } else {
      relativePath = `uploads/general/${safeName}`;
    }

    const bytes = await file.arrayBuffer();
    await writeFile(filePath, Buffer.from(bytes));

    // 通用附件：写入数据库记录
    if (entityType && entityId) {
      await prisma.fileAttachment.create({
        data: {
          entityType,
          entityId,
          fileName: file.name,
          filePath: `/${relativePath}`,
          fileSize: file.size,
          mimeType: file.type || "application/octet-stream",
          uploadedById: user.id,
        },
      });
    }

    return NextResponse.json({
      fileName: file.name,
      filePath: `/${relativePath}`,
      fileSize: file.size,
      mimeType: file.type,
    });
  } catch (e) {
    console.error("Upload error:", e);
    const msg = e instanceof Error ? e.message : "";
    return NextResponse.json(
      { error: msg.includes("ENOENT") || msg.includes("EACCES") ? "文件写入失败，请检查服务器权限" : "上传失败，请检查文件格式和大小或稍后重试" },
      { status: 500 }
    );
  }
}
