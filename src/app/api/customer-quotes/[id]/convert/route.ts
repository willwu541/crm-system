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
  const quote = await prisma.customerQuote.findUnique({
    where: { id },
    include: { items: true, customer: { select: { id: true, name: true } } },
  });
  if (!quote) return NextResponse.json({ error: "报价不存在" }, { status: 404 });
  if (quote.status === "WON") return NextResponse.json({ error: "该报价已转化" }, { status: 400 });

  const now = new Date();
  const orderNo = `DD-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

  const result = await prisma.$transaction(async (tx) => {
    const order = await tx.order.create({
      data: {
        orderNo,
        customerId: quote.customerId,
        customerName: quote.customer.name,
        contactName: quote.contactName,
        contactPhone: quote.contactPhone,
        projectName: quote.projectName || "",
        deliveryRegion: quote.deliveryRegion || "",
        remark: `由报价 ${quote.quoteNo} 转化而成${quote.remark ? `\n${quote.remark}` : ""}`,
        status: "DRAFT",
        createdById: user.id,
        items: {
          create: quote.items.map((it, idx) => ({
            sortOrder: idx,
            productType: it.productType,
            specModel: it.specModel,
            dimensions: it.dimensions,
            quantity: it.quantity,
            unit: it.unit,
            remark: it.remark,
          })),
        },
      },
    });

    await tx.customerQuote.update({
      where: { id },
      data: { status: "WON", wonOrderId: order.id },
    });

    return order;
  });

  return NextResponse.json({ data: result });
}
