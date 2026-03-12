import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateOrderNo } from "@/lib/utils";
import { z } from "zod";

export async function GET(request: NextRequest) {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const pageSize = Math.min(20, Math.max(5, parseInt(searchParams.get("pageSize") ?? "10", 10)));
  const status = searchParams.get("status");
  const mainStatus = searchParams.get("mainStatus");
  const keyword = searchParams.get("keyword")?.trim();

  const where: Record<string, unknown> = {};
  if (user.role === "SALES") {
    where.createdById = user.id;
  }
  if (status && ["DRAFT", "PUBLISHED", "CLOSED"].includes(status)) {
    where.status = status;
  }
  if (mainStatus && ["CONVERTED", "IN_PRODUCTION", "PENDING_SHIPMENT", "COMPLETED", "CANCELLED"].includes(mainStatus)) {
    where.mainStatus = mainStatus;
  }
  if (keyword) {
    where.OR = [
      { orderNo: { contains: keyword, mode: "insensitive" } },
      { customerName: { contains: keyword, mode: "insensitive" } },
      { projectName: { contains: keyword, mode: "insensitive" } },
    ];
  }

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      include: {
        createdBy: { select: { name: true } },
        _count: { select: { quotes: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.order.count({ where }),
  ]);

  return NextResponse.json({
    data: orders,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  });
}

const orderItemSchema = z.object({
  productType: z.string().min(1, "产品类型必填"),
  specModel: z.string().min(1, "规格型号必填"),
  dimensions: z.string().optional(),
  quantity: z.union([z.number(), z.string()]).transform((v) => Number(v)),
  unit: z.string().min(1, "单位必填"),
  surfaceTreatment: z.string().optional(),
  specialRequirement: z.string().optional(),
  remark: z.string().optional(),
});

const createOrderSchema = z.object({
  customerName: z.string().min(1, "客户名称必填"),
  contactName: z.string().min(1, "联系人必填"),
  contactPhone: z.string().min(1, "联系电话必填"),
  projectName: z.string().min(1, "项目名称必填"),
  deliveryRegion: z.string().min(1, "交货地区必填"),
  quoteDeadline: z.string().optional(),
  remark: z.string().optional(),
  items: z.array(orderItemSchema).min(1, "至少添加一条明细"),
});

export async function POST(request: NextRequest) {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = createOrderSchema.safeParse(body);
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message ?? "参数错误";
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    const data = parsed.data;
    const orderNo = generateOrderNo();

    const order = await prisma.order.create({
      data: {
        orderNo,
        customerName: data.customerName,
        contactName: data.contactName,
        contactPhone: data.contactPhone,
        projectName: data.projectName,
        deliveryRegion: data.deliveryRegion,
        quoteDeadline: data.quoteDeadline ? new Date(data.quoteDeadline) : null,
        remark: data.remark ?? null,
        status: "DRAFT",
        createdById: user.id,
        items: {
          create: data.items.map((item, i) => ({
            sortOrder: i,
            productType: item.productType,
            specModel: item.specModel,
            dimensions: item.dimensions ?? null,
            quantity: item.quantity,
            unit: item.unit,
            surfaceTreatment: item.surfaceTreatment ?? null,
            specialRequirement: item.specialRequirement ?? null,
            remark: item.remark ?? null,
          })),
        },
      },
      include: {
        items: true,
      },
    });

    return NextResponse.json({ data: order });
  } catch (e) {
    console.error("Create order error:", e);
    return NextResponse.json({ error: "创建订单失败" }, { status: 500 });
  }
}
