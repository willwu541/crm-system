import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

const ALLOWED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "application/zip",
];
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

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

    if (!file || file.size === 0) {
      return NextResponse.json({ error: "请选择文件" }, { status: 400 });
    }
    if (!orderId) {
      return NextResponse.json({ error: "缺少 orderId" }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type) && !file.name.match(/\.(pdf|jpg|jpeg|png|gif|zip)$/i)) {
      return NextResponse.json(
        { error: "仅支持 pdf、jpg、png、gif、zip 格式" },
        { status: 400 }
      );
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "文件大小不能超过 10MB" }, { status: 400 });
    }

    const dir = orderItemId
      ? path.join(process.cwd(), "public", "uploads", orderId, "items", orderItemId)
      : path.join(process.cwd(), "public", "uploads", orderId);
    await mkdir(dir, { recursive: true });

    const ext = path.extname(file.name) || "";
    const safeName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
    const filePath = path.join(dir, safeName);
    const relativePath = orderItemId
      ? `uploads/${orderId}/items/${orderItemId}/${safeName}`
      : `uploads/${orderId}/${safeName}`;

    const bytes = await file.arrayBuffer();
    await writeFile(filePath, Buffer.from(bytes));

    return NextResponse.json({
      fileName: file.name,
      filePath: `/${relativePath}`,
      fileSize: file.size,
      mimeType: file.type,
    });
  } catch (e) {
    console.error("Upload error:", e);
    return NextResponse.json({ error: "上传失败" }, { status: 500 });
  }
}
