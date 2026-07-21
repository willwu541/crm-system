import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { customerOwnerFilter } from "@/lib/domestic/customer-access";
import { z } from "zod";

export async function GET(request: NextRequest) {
  const user = await getSession();
  if (!user || user.tenant !== "domestic") {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const pageSize = Math.min(50, Math.max(5, parseInt(searchParams.get("pageSize") ?? "10", 10)));
  const status = searchParams.get("status");
  const keyword = searchParams.get("keyword")?.trim();
  const pool = searchParams.get("pool");

  const where: Record<string, unknown> = { ...customerOwnerFilter(user) };
  if (status && ["ACTIVE", "DORMANT", "AWAKENING", "LOST"].includes(status)) {
    where.status = status;
  }
  if (pool === "pool") {
    where.isInPool = true;
    where.isDealLost = false;
    // 公海时不限制 owner
    delete where.ownerId;
  } else if (pool === "deal_lost") {
    where.isDealLost = true;
    where.isInPool = true;
    delete where.ownerId;
  } else if (pool === "mine") {
    where.ownerId = user.id;
    where.isInPool = false;
  }
  if (keyword) {
    where.OR = [
      { name: { contains: keyword, mode: "insensitive" } },
      { contactName: { contains: keyword, mode: "insensitive" } },
      { contactPhone: { contains: keyword, mode: "insensitive" } },
      { wechat: { contains: keyword, mode: "insensitive" } },
    ];
  }

  const [data, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      include: {
        owner: { select: { name: true } },
        _count: { select: { recordings: true, orders: true } },
      },
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.customer.count({ where }),
  ]);

  return NextResponse.json({
    data,
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  });
}

const createSchema = z.object({
  name: z.string().min(1, "客户名称必填"),
  contactName: z.string().min(1, "联系人必填"),
  contactPhone: z.string().min(1, "联系电话必填"),
  wechat: z.string().optional(),
  region: z.string().optional(),
  source: z.string().optional(),
  remark: z.string().optional(),
  nextFollowUpAt: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const user = await getSession();
  if (!user || user.tenant !== "domestic") {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "参数错误" }, { status: 400 });
    }

    const data = parsed.data;
    const customer = await prisma.customer.create({
      data: {
        name: data.name.trim(),
        contactName: data.contactName.trim(),
        contactPhone: data.contactPhone.trim(),
        wechat: data.wechat?.trim() || null,
        region: data.region?.trim() || null,
        source: data.source?.trim() || null,
        remark: data.remark?.trim() || null,
        nextFollowUpAt: data.nextFollowUpAt ? new Date(data.nextFollowUpAt) : null,
        lastContactAt: new Date(),
        ownerId: user.id,
        createdById: user.id,
      },
    });

    return NextResponse.json({ data: customer });
  } catch (e) {
    console.error("Create customer error:", e);
    return NextResponse.json({ error: "创建客户失败" }, { status: 500 });
  }
}
