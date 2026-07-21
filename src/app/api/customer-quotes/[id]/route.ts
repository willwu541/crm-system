import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getSession();
  if (!user || user.tenant !== "domestic") return NextResponse.json({ error: "未登录" }, { status: 401 });

  const { id } = await params;
  const quote = await prisma.customerQuote.findUnique({
    where: { id },
    include: {
      customer: { select: { id: true, name: true, contactName: true, contactPhone: true } },
      createdBy: { select: { id: true, name: true } },
      approvedBy: { select: { id: true, name: true } },
      items: { orderBy: { sortOrder: "asc" } },
      wonOrder: { select: { id: true, orderNo: true } },
    },
  });
  if (!quote) return NextResponse.json({ error: "报价不存在" }, { status: 404 });
  if (user.role === "SALES" && quote.createdById !== user.id) {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }
  return NextResponse.json({ data: quote });
}

const updateSchema = z.object({
  status: z.enum(["DRAFT", "SENT", "NEGOTIATING", "WON", "LOST"]).optional(),
  remark: z.string().optional(),
  approved: z.boolean().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getSession();
  if (!user || user.tenant !== "domestic") return NextResponse.json({ error: "未登录" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.customerQuote.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "报价不存在" }, { status: 404 });
  if (user.role === "SALES" && existing.createdById !== user.id) {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "参数错误" }, { status: 400 });

    const data = parsed.data;
    const updateData: Record<string, unknown> = {};
    if (data.status !== undefined) updateData.status = data.status;
    if (data.remark !== undefined) updateData.remark = data.remark?.trim() || null;
    if (data.approved === true && user.role !== "SALES") {
      updateData.approvedById = user.id;
      updateData.approvedAt = new Date();
    }

    const quote = await prisma.customerQuote.update({
      where: { id },
      data: updateData,
      include: {
        customer: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
        approvedBy: { select: { id: true, name: true } },
        items: { orderBy: { sortOrder: "asc" } },
      },
    });

    return NextResponse.json({ data: quote });
  } catch (e) {
    console.error("Update quote error:", e);
    return NextResponse.json({ error: "更新失败" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getSession();
  if (!user || user.tenant !== "domestic") return NextResponse.json({ error: "未登录" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.customerQuote.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "报价不存在" }, { status: 404 });
  if (user.role !== "ADMIN" && user.role !== "MANAGER" && existing.createdById !== user.id) {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }

  await prisma.customerQuote.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
