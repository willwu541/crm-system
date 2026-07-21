import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export async function GET(request: NextRequest) {
  const user = await getSession();
  if (!user || user.tenant !== "domestic") return NextResponse.json({ error: "未登录" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const pageSize = Math.min(50, Math.max(10, parseInt(searchParams.get("pageSize") ?? "20")));
  const status = searchParams.get("status");
  const keyword = searchParams.get("keyword")?.trim();

  const where: Record<string, unknown> = {};
  if (user.role === "SALES") where.createdById = user.id;
  if (status) where.status = status;
  if (keyword) {
    where.OR = [
      { quoteNo: { contains: keyword, mode: "insensitive" } },
      { contactName: { contains: keyword, mode: "insensitive" } },
    ];
  }

  const [data, total] = await Promise.all([
    prisma.customerQuote.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        customer: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
        approvedBy: { select: { id: true, name: true } },
        items: { orderBy: { sortOrder: "asc" } },
        wonOrder: { select: { id: true, orderNo: true } },
      },
    }),
    prisma.customerQuote.count({ where }),
  ]);

  return NextResponse.json({ data, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } });
}

const createSchema = z.object({
  customerId: z.string().min(1),
  contactName: z.string().min(1),
  contactPhone: z.string().min(1),
  projectName: z.string().optional(),
  deliveryRegion: z.string().optional(),
  includeTax: z.boolean().optional(),
  includeShipping: z.boolean().optional(),
  paymentTerm: z.string().optional(),
  validUntil: z.string().optional(),
  remark: z.string().optional(),
  items: z.array(z.object({
    productType: z.string().min(1),
    specModel: z.string().min(1),
    material: z.string().optional(),
    dimensions: z.string().optional(),
    quantity: z.number().positive(),
    unit: z.string().min(1),
    unitPrice: z.number().positive(),
    amount: z.number().positive(),
    theoryWeight: z.number().optional(),
    actualWeight: z.number().optional(),
    remark: z.string().optional(),
  })).min(1),
});

export async function POST(request: NextRequest) {
  const user = await getSession();
  if (!user || user.tenant !== "domestic") return NextResponse.json({ error: "未登录" }, { status: 401 });

  try {
    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "参数错误" }, { status: 400 });

    const data = parsed.data;
    const now = new Date();
    const quoteNo = `BJ-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

    const totalAmount = data.items.reduce((sum, it) => sum + it.amount, 0);

    const quote = await prisma.customerQuote.create({
      data: {
        customerId: data.customerId,
        quoteNo,
        contactName: data.contactName.trim(),
        contactPhone: data.contactPhone.trim(),
        projectName: data.projectName?.trim() || null,
        deliveryRegion: data.deliveryRegion?.trim() || null,
        includeTax: data.includeTax ?? true,
        includeShipping: data.includeShipping ?? false,
        paymentTerm: data.paymentTerm?.trim() || null,
        validUntil: data.validUntil ? new Date(data.validUntil) : null,
        totalAmount,
        status: "DRAFT",
        remark: data.remark?.trim() || null,
        createdById: user.id,
        items: {
          create: data.items.map((it, idx) => ({
            sortOrder: idx,
            productType: it.productType.trim(),
            specModel: it.specModel.trim(),
            material: it.material?.trim() || null,
            dimensions: it.dimensions?.trim() || null,
            quantity: it.quantity,
            unit: it.unit.trim(),
            unitPrice: it.unitPrice,
            amount: it.amount,
            theoryWeight: it.theoryWeight ?? null,
            actualWeight: it.actualWeight ?? null,
            remark: it.remark?.trim() || null,
          })),
        },
      },
      include: { customer: { select: { id: true, name: true } }, items: { orderBy: { sortOrder: "asc" } } },
    });

    return NextResponse.json({ data: quote }, { status: 201 });
  } catch (e) {
    console.error("Create quote error:", e);
    return NextResponse.json({ error: "创建失败" }, { status: 500 });
  }
}
