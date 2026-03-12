import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateOrderNo } from "@/lib/utils";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const { id: oppId } = await params;
  const opp = await prisma.opportunity.findFirst({
    where: {
      id: oppId,
      ...(user.role === "SALES" ? { createdById: user.id } : {}),
    },
    include: { customer: true },
  });

  if (!opp) return NextResponse.json({ error: "商机不存在" }, { status: 404 });
  const existingOrder = await prisma.order.findFirst({
    where: { opportunityId: oppId },
  });
  if (opp.status === "CONVERTED" || existingOrder) {
    return NextResponse.json(
      { error: "已转订单", orderId: existingOrder?.id },
      { status: 400 }
    );
  }
  if (opp.status === "CANCELLED") {
    return NextResponse.json({ error: "已取消的商机无法转订单" }, { status: 400 });
  }

  const orderNo = generateOrderNo();
  const order = await prisma.$transaction(async (tx) => {
    const o = await tx.order.create({
      data: {
        orderNo,
        customerId: opp.customerId,
        opportunityId: oppId,
        customerName: opp.customer.name,
        contactName: opp.customer.contactName,
        contactPhone: opp.customer.contactPhone,
        projectName: opp.projectName,
        deliveryRegion: "",
        status: "DRAFT",
        mainStatus: "CONVERTED",
        isQuoted: opp.isQuoted,
        intentionLevel: opp.intentionLevel,
        createdById: user.id,
      },
    });
    await tx.opportunity.update({
      where: { id: oppId },
      data: { status: "CONVERTED" },
    });
    return o;
  });

  return NextResponse.json({ data: order });
}
