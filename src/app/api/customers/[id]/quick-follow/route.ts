import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getSession();
  if (!user || user.tenant !== "domestic") return NextResponse.json({ error: "未登录" }, { status: 401 });

  const { id } = await params;
  const customer = await prisma.customer.findUnique({ where: { id }, select: { id: true, name: true } });
  if (!customer) return NextResponse.json({ error: "客户不存在" }, { status: 404 });

  const now = new Date();
  await Promise.all([
    prisma.followUp.create({
      data: {
        customerId: id,
        content: `快速跟进：已联系 ${customer.name}`,
        type: "call",
        outcome: "有意向",
        createdById: user.id,
      },
    }),
    prisma.customer.update({
      where: { id },
      data: {
        lastContactAt: now,
        lastFollowUpAt: now,
        nextFollowUpAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
