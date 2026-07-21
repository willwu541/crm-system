import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateSchema = z.object({
  content: z.string().min(1).optional(),
  mediaUrls: z.array(z.string()).optional(),
  category: z.string().optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getSession();
  if (!user || user.tenant !== "domestic") return NextResponse.json({ error: "未登录" }, { status: 401 });
  if (user.role === "SALES") return NextResponse.json({ error: "无权限" }, { status: 403 });

  const { id } = await params;
  try {
    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "参数错误" }, { status: 400 });

    const data = parsed.data;
    const moment = await prisma.moment.update({
      where: { id },
      data: {
        ...(data.content !== undefined ? { content: data.content.trim() } : {}),
        ...(data.mediaUrls !== undefined ? { mediaUrls: data.mediaUrls } : {}),
        ...(data.category !== undefined ? { category: data.category?.trim() || null } : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
        ...(data.sortOrder !== undefined ? { sortOrder: data.sortOrder } : {}),
      },
    });

    return NextResponse.json({ data: moment });
  } catch (e) {
    console.error("Update moment error:", e);
    return NextResponse.json({ error: "更新失败" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getSession();
  if (!user || user.tenant !== "domestic") return NextResponse.json({ error: "未登录" }, { status: 401 });
  if (user.role === "SALES") return NextResponse.json({ error: "无权限" }, { status: 403 });

  const { id } = await params;
  await prisma.moment.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
