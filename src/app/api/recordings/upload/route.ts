import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

const ALLOWED_TYPES = [
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/mp4",
  "audio/m4a",
  "audio/x-m4a",
  "audio/amr",
  "audio/ogg",
  "audio/webm",
];
const ALLOWED_EXT = /\.(mp3|wav|m4a|amr|ogg|webm|aac)$/i;
const MAX_SIZE = 100 * 1024 * 1024; // 100MB

export async function POST(request: NextRequest) {
  const user = await getSession();
  if (!user || user.tenant !== "domestic") {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const customerId = formData.get("customerId") as string | null;

    if (!file || file.size === 0) {
      return NextResponse.json({ error: "请选择录音文件" }, { status: 400 });
    }
    if (!customerId) {
      return NextResponse.json({ error: "缺少 customerId" }, { status: 400 });
    }

    const extOk = ALLOWED_EXT.test(file.name);
    const typeOk = !file.type || ALLOWED_TYPES.includes(file.type);
    if (!extOk && !typeOk) {
      return NextResponse.json(
        { error: "仅支持 mp3、wav、m4a、amr、ogg、webm 等音频格式" },
        { status: 400 }
      );
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "录音文件不能超过 100MB" }, { status: 400 });
    }

    const dir = path.join(process.cwd(), "public", "uploads", "recordings", customerId);
    await mkdir(dir, { recursive: true });

    const ext = path.extname(file.name) || ".mp3";
    const safeName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
    const filePath = path.join(dir, safeName);
    const relativePath = `uploads/recordings/${customerId}/${safeName}`;

    const bytes = await file.arrayBuffer();
    await writeFile(filePath, Buffer.from(bytes));

    return NextResponse.json({
      fileName: file.name,
      filePath: `/${relativePath}`,
      fileSize: file.size,
      mimeType: file.type || "audio/mpeg",
    });
  } catch (e) {
    console.error("Recording upload error:", e);
    return NextResponse.json({ error: "录音上传失败" }, { status: 500 });
  }
}
