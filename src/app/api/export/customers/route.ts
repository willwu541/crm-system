import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireExportSession } from "@/lib/export/auth";
import { generateCustomerCode } from "@/lib/export/number-generator";
import { parseInterestedProducts } from "@/lib/export/interested-products";
import { z } from "zod";

export async function GET(request: NextRequest) {
  const { ctx, error } = await requireExportSession();
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const pageSize = Math.min(500, Math.max(10, parseInt(searchParams.get("pageSize") ?? "20")));
  const keyword = searchParams.get("keyword")?.trim();
  const status = searchParams.get("status")?.trim();
  const country = searchParams.get("country")?.trim();
  const ownerId = searchParams.get("ownerId")?.trim();
  const filter = searchParams.get("filter")?.trim();
  const sortBy = searchParams.get("sortBy") ?? "createdAt";
  const sortOrder = searchParams.get("sortOrder") ?? "desc";

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const where: Record<string, unknown> = { tenantId: ctx!.tenantId };
  if (ownerId) where.ownerId = ownerId;
  else if (ctx!.ownerFilter) where.ownerId = ctx!.ownerFilter.ownerId;
  if (status) where.status = status;
  if (filter === "today") {
    where.nextFollowUpAt = { gte: todayStart, lt: todayEnd };
    where.status = { notIn: ["won", "lost"] };
  }
  if (filter === "overdue") {
    where.status = { notIn: ["won", "lost"] };
    where.OR = [
      { lastFollowUpAt: { lt: sevenDaysAgo } },
      { lastFollowUpAt: null, createdAt: { lt: sevenDaysAgo } },
    ];
  }
  if (country) where.country = { contains: country, mode: "insensitive" };
  if (keyword) {
    where.OR = [
      { companyName: { contains: keyword, mode: "insensitive" } },
      { customerCode: { contains: keyword, mode: "insensitive" } },
    ];
  }

  const [data, total] = await Promise.all([
    prisma.exportCustomer.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { owner: { select: { id: true, name: true } } },
    }),
    prisma.exportCustomer.count({ where }),
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
  companyName: z.string().min(1),
  customerCode: z.string().optional(),
  website: z.string().optional(),
  country: z.string().optional(),
  city: z.string().optional(),
  address: z.string().optional(),
  customerType: z.string().optional(),
  industry: z.string().optional(),
  marketPriority: z.string().optional(),
  valueLevel: z.string().optional(),
  interestedProducts: z.union([z.string(), z.array(z.string())]).optional(),
  sourceChannel: z.string().optional(),
  status: z.string().optional(),
  notes: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const { user, ctx, error } = await requireExportSession();
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

    const customerCode = parsed.data.customerCode ?? (await generateCustomerCode(ctx!.tenantId));
    const existing = await prisma.exportCustomer.findUnique({
      where: { tenantId_customerCode: { tenantId: ctx!.tenantId, customerCode } },
    });
    if (existing) {
      return NextResponse.json({ error: "客户编号已存在" }, { status: 400 });
    }

    const { interestedProducts, ...rest } = parsed.data;
    const customer = await prisma.exportCustomer.create({
      data: {
        ...rest,
        tenantId: ctx!.tenantId,
        customerCode,
        ownerId: user!.id,
        status: parsed.data.status ?? "to_develop",
        interestedProducts: parseInterestedProducts(interestedProducts),
      },
      include: { owner: { select: { id: true, name: true } } },
    });
    return NextResponse.json({ data: customer });
  } catch (e) {
    console.error("Create customer error:", e);
    return NextResponse.json({ error: "创建失败" }, { status: 500 });
  }
}
