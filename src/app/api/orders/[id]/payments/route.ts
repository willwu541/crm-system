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
  const order = await prisma.order.findUnique({ where: { id }, select: { id: true, createdById: true, totalAmount: true, paidAmount: true } });
  if (!order) return NextResponse.json({ error: "订单不存在" }, { status: 404 });
  if (user.role === "SALES" && order.createdById !== user.id) {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }

  const payments = await prisma.orderPayment.findMany({
    where: { orderId: id },
    orderBy: { paymentDate: "desc" },
    include: { recordedBy: { select: { id: true, name: true } } },
  });

  return NextResponse.json({ data: payments, total: order.totalAmount, paid: order.paidAmount });
}

const createSchema = z.object({
  amount: z.number().positive(),
  paymentDate: z.string().optional(),
  method: z.enum(["BANK", "CASH", "WECHAT", "ALIPAY", "OTHER"]).default("BANK"),
  remark: z.string().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getSession();
  if (!user || user.tenant !== "domestic") return NextResponse.json({ error: "未登录" }, { status: 401 });

  const { id } = await params;
  const order = await prisma.order.findUnique({ where: { id }, select: { id: true, createdById: true, totalAmount: true, paidAmount: true } });
  if (!order) return NextResponse.json({ error: "订单不存在" }, { status: 404 });
  if (user.role === "SALES" && order.createdById !== user.id) {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "参数错误" }, { status: 400 });

    const data = parsed.data;
    const newPaid = Number(order.paidAmount || 0) + data.amount;

    const payment = await prisma.$transaction(async (tx) => {
      const p = await tx.orderPayment.create({
        data: {
          orderId: id,
          amount: data.amount,
          paymentDate: data.paymentDate ? new Date(data.paymentDate) : new Date(),
          method: data.method,
          remark: data.remark?.trim() || null,
          recordedById: user.id,
        },
        include: { recordedBy: { select: { id: true, name: true } } },
      });
      await tx.order.update({ where: { id }, data: { paidAmount: newPaid } });
      return p;
    });

    return NextResponse.json({ data: payment });
  } catch (e) {
    console.error("Create payment error:", e);
    return NextResponse.json({ error: "记录失败" }, { status: 500 });
  }
}
