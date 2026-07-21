import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getSession();
  if (!user || user.tenant !== "domestic") {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const { id } = await params;
  const lead = await prisma.lead.findUnique({
    where: { id },
    include: {
      owner: { select: { id: true, name: true } },
      customer: { select: { id: true, name: true } },
      tasks: { orderBy: { createdAt: "desc" }, take: 10 },
    },
  });

  if (!lead) {
    return NextResponse.json({ error: "线索不存在" }, { status: 404 });
  }

  if (user.role === "SALES" && lead.ownerId !== user.id) {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }

  return NextResponse.json({ data: lead });
}

const updateSchema = z.object({
  companyName: z.string().min(1).optional(),
  contactName: z.string().min(1).optional(),
  contactPhone: z.string().min(1).optional(),
  wechat: z.string().optional(),
  region: z.string().optional(),
  source: z.string().optional(),
  industry: z.string().optional(),
  productNeed: z.string().optional(),
  intention: z.string().optional(),
  status: z.enum(["NEW", "CONTACTED", "QUALIFIED", "CONVERTED", "LOST"]).optional(),
  remark: z.string().optional(),
  ownerId: z.string().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getSession();
  if (!user || user.tenant !== "domestic") {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await prisma.lead.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "线索不存在" }, { status: 404 });
  }

  if (user.role === "SALES" && existing.ownerId !== user.id) {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "参数错误" }, { status: 400 });
    }

    const data = parsed.data;
    const updateData: Record<string, unknown> = {};
    if (data.companyName !== undefined) updateData.companyName = data.companyName.trim();
    if (data.contactName !== undefined) updateData.contactName = data.contactName.trim();
    if (data.contactPhone !== undefined) updateData.contactPhone = data.contactPhone.trim();
    if (data.wechat !== undefined) updateData.wechat = data.wechat?.trim() || null;
    if (data.region !== undefined) updateData.region = data.region?.trim() || null;
    if (data.source !== undefined) updateData.source = data.source?.trim() || null;
    if (data.industry !== undefined) updateData.industry = data.industry?.trim() || null;
    if (data.productNeed !== undefined) updateData.productNeed = data.productNeed?.trim() || null;
    if (data.intention !== undefined) updateData.intention = data.intention?.trim() || null;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.remark !== undefined) updateData.remark = data.remark?.trim() || null;
    if (data.ownerId !== undefined && user.role !== "SALES") {
      updateData.ownerId = data.ownerId;
    }

    const lead = await prisma.lead.update({
      where: { id },
      data: updateData,
      include: { owner: { select: { id: true, name: true } }, customer: { select: { id: true, name: true } } },
    });

    return NextResponse.json({ data: lead });
  } catch (e) {
    console.error("Update lead error:", e);
    return NextResponse.json({ error: "更新失败" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getSession();
  if (!user || user.tenant !== "domestic") {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await prisma.lead.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "线索不存在" }, { status: 404 });
  }

  if (user.role !== "ADMIN" && user.role !== "MANAGER") {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }

  await prisma.lead.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
