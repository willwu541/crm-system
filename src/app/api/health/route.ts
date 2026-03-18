import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ ok: true, db: "connected" });
  } catch (e) {
    const err = e as Error;
    const msg = String(err?.message ?? "");
    return NextResponse.json(
      {
        ok: false,
        db: "error",
        error: msg,
        hint:
          msg.includes("DATABASE_URL")
            ? "请在项目根目录创建 .env 文件，添加 DATABASE_URL=postgresql://..."
            : msg.includes("relation") || msg.includes("does not exist")
              ? "请运行: npx prisma db push"
              : msg.includes("ECONNREFUSED") || msg.includes("connect")
                ? "请确认 PostgreSQL 已启动且 DATABASE_URL 正确"
                : "请检查 .env 中的 DATABASE_URL 配置",
      },
      { status: 500 }
    );
  }
}
