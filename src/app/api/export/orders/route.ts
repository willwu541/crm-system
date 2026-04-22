import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireExportSession } from "@/lib/export/auth";
import { generateOrderNo } from "@/lib/export/number-generator";
import { z } from "zod";

export async function GET(request: NextRequest) {
  const { ctx, error } = await requireExportSession();
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const pageSize = Math.min(50, Math.max(10, parseInt(searchParams.get("pageSize") ?? "20")));
  const keyword = searchParams.get("keyword")?.trim();
  const status = searchParams.get("status")?.trim();
  const customerId = searchParams.get("customerId")?.trim();
  const ownerId = searchParams.get("ownerId")?.trim();
  const sortByRaw = searchParams.get("sortBy") ?? "orderDate";
  const sortOrder = searchParams.get("sortOrder") === "asc" ? "asc" : "desc";
  const allowedSort = new Set([
    "createdAt",
    "updatedAt",
    "orderDate",
    "eta",
    "paymentStatus",
    "productionStatus",
    "shippingStatus",
    "totalAmount",
  ]);
  const sortBy = allowedSort.has(sortByRaw) ? sortByRaw : "orderDate";

  const where: Record<string, unknown> = { tenantId: ctx!.tenantId };
  if (customerId) where.customerId = customerId;
  if (ownerId) where.customer = { ownerId };
  else if (ctx!.ownerFilter) where.customer = { ownerId: ctx!.ownerFilter.ownerId };
  if (status) {
    if (["unpaid", "partial_paid", "paid"].includes(status)) where.paymentStatus = status;
    else if (["pending", "in_production", "completed"].includes(status)) where.productionStatus = status;
    else if (["pending", "ready_to_ship", "shipped", "completed"].includes(status)) where.shippingStatus = status;
  }
  if (keyword) {
    where.OR = [
      { orderNo: { contains: keyword, mode: "insensitive" } },
      { customer: { companyName: { contains: keyword, mode: "insensitive" } } },
    ];
  }

  const [data, total] = await Promise.all([
    prisma.exportOrder.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        customer: { select: { id: true, companyName: true, customerCode: true } },
        quote: { select: { id: true, quoteNo: true } },
      },
    }),
    prisma.exportOrder.count({ where }),
  ]);

  return NextResponse.json({
    data,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  });
}

const createSchema = z.object({
  customerId: z.string().min(1),
  quoteId: z.string().optional().nullable(),
  orderDate: z.string().optional(),
  currency: z.string().optional(),
  totalAmount: z.union([z.number(), z.string()]).optional(),
  paymentTerm: z.string().optional(),
  paymentStatus: z.string().optional(),
  productionStatus: z.string().optional(),
  shippingStatus: z.string().optional(),
  eta: z.string().optional().nullable(),
  notes: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const { ctx, error } = await requireExportSession();
  if (error) return error;

  try {
    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "参数错误" },
        { status: 400 }
      );
    }

    const customer = await prisma.exportCustomer.findUnique({
      where: { id: parsed.data.customerId, tenantId: ctx!.tenantId },
    });
    if (!customer) return NextResponse.json({ error: "客户不存在" }, { status: 404 });
    if (ctx!.ownerFilter && customer.ownerId !== ctx!.ownerFilter.ownerId) {
      return NextResponse.json({ error: "无权限" }, { status: 403 });
    }

    const orderNo = await generateOrderNo(ctx!.tenantId);
    const orderDate = parsed.data.orderDate ? new Date(parsed.data.orderDate) : new Date();
    const eta = parsed.data.eta ? new Date(parsed.data.eta) : undefined;
    const totalAmount = parsed.data.totalAmount != null ? Number(parsed.data.totalAmount) : undefined;

    const order = await prisma.exportOrder.create({
      data: {
        tenantId: ctx!.tenantId,
        orderNo,
        customerId: parsed.data.customerId,
        quoteId: parsed.data.quoteId ?? undefined,
        orderDate,
        currency: parsed.data.currency,
        totalAmount,
        paymentTerm: parsed.data.paymentTerm,
        paymentStatus: parsed.data.paymentStatus ?? "unpaid",
        productionStatus: parsed.data.productionStatus ?? "pending",
        shippingStatus: parsed.data.shippingStatus ?? "pending",
        eta,
        notes: parsed.data.notes,
      },
      include: {
        customer: { select: { id: true, companyName: true, customerCode: true } },
        quote: { select: { id: true, quoteNo: true } },
      },
    });
    return NextResponse.json({ data: order });
  } catch (e) {
    console.error("Create order error:", e);
    return NextResponse.json({ error: "创建失败" }, { status: 500 });
  }
}
