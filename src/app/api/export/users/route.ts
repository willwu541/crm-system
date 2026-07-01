import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireExportSession } from "@/lib/export/auth";

export async function GET() {
  const { ctx, error } = await requireExportSession();
  if (error) return error;

  try {
    const users = await prisma.user.findMany({
      where: { tenant: "export", tenantId: ctx!.tenantId, isActive: true },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ data: users });
  } catch (e) {
    console.error("Export users list error:", e);
    return NextResponse.json({ error: "加载用户列表失败" }, { status: 500 });
  }
}
