import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireExportSession } from "@/lib/export/auth";
import { generateQuoteNo } from "@/lib/export/number-generator";
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
  const sortBy = searchParams.get("sortBy") ?? "createdAt";
  const sortOrder = searchParams.get("sortOrder") ?? "desc";

  const where: Record<string, unknown> = { tenantId: ctx!.tenantId };
  if (customerId) where.customerId = customerId;
  if (status) where.status = status;
  if (ownerId) where.customer = { ownerId };
  else if (ctx!.ownerFilter) where.customer = { ownerId: ctx!.ownerFilter.ownerId };
  if (keyword) {
    where.OR = [
      { quoteNo: { contains: keyword, mode: "insensitive" } },
      { customer: { companyName: { contains: keyword, mode: "insensitive" } } },
    ];
  }

  const [data, total] = await Promise.all([
    prisma.exportQuote.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        customer: { select: { id: true, companyName: true, customerCode: true } },
        contact: { select: { id: true, name: true } },
        _count: { select: { orders: true } },
      },
    }),
    prisma.exportQuote.count({ where }),
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
  contactId: z.string().optional().nullable(),
  quoteDate: z.string().optional(),
  currency: z.string().optional(),
  incoterm: z.string().optional(),
  validityDate: z.string().optional().nullable(),
  productSummary: z.string().optional(),
  totalAmount: z.union([z.number(), z.string()]).optional(),
  status: z.string().optional(),
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

    const quoteNo = await generateQuoteNo(ctx!.tenantId);
    const quoteDate = parsed.data.quoteDate ? new Date(parsed.data.quoteDate) : new Date();
    const validityDate = parsed.data.validityDate ? new Date(parsed.data.validityDate) : undefined;
    const totalAmount = parsed.data.totalAmount != null ? Number(parsed.data.totalAmount) : undefined;

    const quote = await prisma.exportQuote.create({
      data: {
        tenantId: ctx!.tenantId,
        quoteNo,
        customerId: parsed.data.customerId,
        contactId: parsed.data.contactId ?? undefined,
        quoteDate,
        currency: parsed.data.currency,
        incoterm: parsed.data.incoterm,
        validityDate,
        productSummary: parsed.data.productSummary,
        totalAmount,
        status: parsed.data.status ?? "draft",
        notes: parsed.data.notes,
      },
      include: {
        customer: { select: { id: true, companyName: true, customerCode: true } },
        contact: { select: { id: true, name: true } },
      },
    });
    return NextResponse.json({ data: quote });
  } catch (e) {
    console.error("Create quote error:", e);
    return NextResponse.json({ error: "创建失败" }, { status: 500 });
  }
}
