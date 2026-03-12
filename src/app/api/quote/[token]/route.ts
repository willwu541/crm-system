import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const quoteItemSchema = z.object({
  orderItemId: z.string(),
  price: z.union([z.number(), z.string()]).transform((v) => Number(v)),
  remark: z.string().optional(),
});

const submitQuoteSchema = z.object({
  supplierName: z.string().min(1, "厂家名称必填"),
  contactName: z.string().min(1, "联系人必填"),
  contactPhone: z.string().min(1, "手机号必填"),
  contactWechat: z.string().optional(),
  totalRemark: z.string().optional(),
  expectedDelivery: z.string().optional(),
  includeTax: z.boolean().optional(),
  includeShipping: z.boolean().optional(),
  quoteItems: z.array(quoteItemSchema).min(1, "至少填写一条报价"),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const link = await prisma.quoteLink.findUnique({
    where: { token },
    include: {
      order: {
        include: {
          items: { orderBy: { sortOrder: "asc" } },
          attachments: { where: { orderItemId: null } },
        },
      },
    },
  });

  if (!link) {
    return NextResponse.json({ error: "链接无效或已失效" }, { status: 404 });
  }

  const now = new Date();
  const expired = link.expiresAt ? link.expiresAt < now : false;

  const itemAttachments = await prisma.orderAttachment.findMany({
    where: {
      orderId: link.orderId,
      orderItemId: { not: null },
    },
  });

  const itemsWithAttachments = link.order.items.map((item) => ({
    ...item,
    attachments: itemAttachments.filter((a) => a.orderItemId === item.id),
  }));

  return NextResponse.json({
    data: {
      order: link.order,
      items: itemsWithAttachments,
      orderAttachments: link.order.attachments,
      expired,
      expiresAt: link.expiresAt,
    },
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const link = await prisma.quoteLink.findUnique({
    where: { token },
    include: { order: { include: { items: true } } },
  });

  if (!link) {
    return NextResponse.json({ error: "链接无效或已失效" }, { status: 404 });
  }

  const now = new Date();
  if (link.expiresAt && link.expiresAt < now) {
    return NextResponse.json({ error: "链接已过期" }, { status: 410 });
  }

  try {
    const body = await request.json();
    const parsed = submitQuoteSchema.safeParse(body);
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message ?? "参数错误";
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    const data = parsed.data;
    const orderItemIds = new Set(link.order.items.map((i) => i.id));

    for (const qi of data.quoteItems) {
      if (!orderItemIds.has(qi.orderItemId)) {
        return NextResponse.json({ error: "无效的明细项" }, { status: 400 });
      }
    }

    const quote = await prisma.quote.create({
      data: {
        orderId: link.orderId,
        quoteLinkId: link.id,
        supplierName: data.supplierName,
        contactName: data.contactName,
        contactPhone: data.contactPhone,
        contactWechat: data.contactWechat ?? null,
        totalRemark: data.totalRemark ?? null,
        expectedDelivery: data.expectedDelivery
          ? new Date(data.expectedDelivery)
          : null,
        includeTax: data.includeTax ?? false,
        includeShipping: data.includeShipping ?? false,
        submittedAt: now,
        items: {
          create: data.quoteItems.map((qi) => ({
            orderItemId: qi.orderItemId,
            price: qi.price,
            remark: qi.remark ?? null,
          })),
        },
      },
      include: { items: true },
    });

    return NextResponse.json({ data: quote, success: true });
  } catch (e) {
    console.error("Submit quote error:", e);
    return NextResponse.json({ error: "提交失败" }, { status: 500 });
  }
}
