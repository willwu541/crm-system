import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { customerOwnerFilter } from "@/lib/domestic/customer-access";
import { z } from "zod";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const user = await getSession();
  if (!user || user.tenant !== "domestic") {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const { id } = await params;
  const customer = await prisma.customer.findFirst({
    where: { id, ...customerOwnerFilter(user) },
    include: {
      owner: { select: { name: true } },
      recordings: { orderBy: { createdAt: "desc" }, take: 20 },
      orders: {
        select: { id: true, orderNo: true, projectName: true, mainStatus: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
  });

  if (!customer) {
    return NextResponse.json({ error: "客户不存在" }, { status: 404 });
  }

  return NextResponse.json({ data: customer });
}

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  contactName: z.string().min(1).optional(),
  contactPhone: z.string().min(1).optional(),
  wechat: z.string().nullable().optional(),
  region: z.string().nullable().optional(),
  source: z.string().nullable().optional(),
  remark: z.string().nullable().optional(),
  status: z.enum(["ACTIVE", "DORMANT", "AWAKENING", "LOST"]).optional(),
  nextFollowUpAt: z.string().nullable().optional(),
  tier: z.enum(["VIP", "NORMAL", "LOW"]).optional(),
});

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const user = await getSession();
  if (!user || user.tenant !== "domestic") {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await prisma.customer.findFirst({
    where: { id, ...customerOwnerFilter(user) },
  });
  if (!existing) {
    return NextResponse.json({ error: "客户不存在" }, { status: 404 });
  }

  try {
    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "参数错误" }, { status: 400 });
    }

    const data = parsed.data;
    const customer = await prisma.customer.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name.trim() } : {}),
        ...(data.contactName !== undefined ? { contactName: data.contactName.trim() } : {}),
        ...(data.contactPhone !== undefined ? { contactPhone: data.contactPhone.trim() } : {}),
        ...(data.wechat !== undefined ? { wechat: data.wechat?.trim() || null } : {}),
        ...(data.region !== undefined ? { region: data.region?.trim() || null } : {}),
        ...(data.source !== undefined ? { source: data.source?.trim() || null } : {}),
        ...(data.remark !== undefined ? { remark: data.remark?.trim() || null } : {}),
        ...(data.status !== undefined ? { status: data.status } : {}),
        ...(data.nextFollowUpAt !== undefined
          ? { nextFollowUpAt: data.nextFollowUpAt ? new Date(data.nextFollowUpAt) : null }
          : {}),
        ...(data.tier !== undefined ? { tier: data.tier } : {}),
      },
    });

    return NextResponse.json({ data: customer });
  } catch (e) {
    console.error("Update customer error:", e);
    return NextResponse.json({ error: "更新客户失败" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const user = await getSession();
  if (!user || user.tenant !== "domestic") {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await prisma.customer.findFirst({
    where: { id, ...customerOwnerFilter(user) },
  });
  if (!existing) {
    return NextResponse.json({ error: "客户不存在" }, { status: 404 });
  }

  await prisma.customer.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
