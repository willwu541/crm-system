import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createOpLog } from "@/lib/oplog";
import { z } from "zod";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const { id } = await params;
  const supplier = await prisma.supplier.findUnique({ where: { id } });
  if (!supplier) return NextResponse.json({ error: "加工户不存在" }, { status: 404 });
  return NextResponse.json({ data: supplier });
}

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  contactName: z.string().min(1).optional(),
  contactPhone: z.string().min(1).optional(),
  address: z.string().optional(),
  remark: z.string().optional(),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const { id } = await params;
  const supplier = await prisma.supplier.findUnique({ where: { id } });
  if (!supplier) return NextResponse.json({ error: "加工户不存在" }, { status: 404 });

  try {
    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message ?? "参数错误";
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    const data: Record<string, unknown> = {};
    if (parsed.data.name !== undefined) data.name = parsed.data.name.trim();
    if (parsed.data.contactName !== undefined) data.contactName = parsed.data.contactName.trim();
    if (parsed.data.contactPhone !== undefined) data.contactPhone = parsed.data.contactPhone.trim();
    if (parsed.data.address !== undefined) data.address = parsed.data.address?.trim() || null;
    if (parsed.data.remark !== undefined) data.remark = parsed.data.remark?.trim() || null;

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "无有效更新" }, { status: 400 });
    }

    await createOpLog({
      action: "修改加工户",
      targetType: "supplier",
      targetId: id,
      targetName: supplier.name,
      userId: user.id,
      userName: user.name,
      details: JSON.stringify(data),
    });

    const updated = await prisma.supplier.update({
      where: { id },
      data: data as never,
    });
    return NextResponse.json({ data: updated });
  } catch (e) {
    console.error("Update supplier error:", e);
    return NextResponse.json({ error: "更新失败" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const { id } = await params;
  const supplier = await prisma.supplier.findUnique({ where: { id } });
  if (!supplier) return NextResponse.json({ error: "加工户不存在" }, { status: 404 });

  try {
    await createOpLog({
      action: "删除加工户",
      targetType: "supplier",
      targetId: id,
      targetName: supplier.name,
      userId: user.id,
      userName: user.name,
    });
    await prisma.supplier.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Delete supplier error:", e);
    return NextResponse.json({ error: "删除失败" }, { status: 500 });
  }
}
