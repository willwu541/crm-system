import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getSession();
  if (!user || user.tenant !== "domestic") return NextResponse.json({ error: "未登录" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.task.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "任务不存在" }, { status: 404 });
  if (existing.ownerId !== user.id) return NextResponse.json({ error: "无权限" }, { status: 403 });

  const task = await prisma.task.update({
    where: { id },
    data: { status: "done", doneAt: new Date() },
  });

  return NextResponse.json({ data: task });
}
