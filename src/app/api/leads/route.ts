import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export async function GET(request: NextRequest) {
  const user = await getSession();
  if (!user || user.tenant !== "domestic") {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const pageSize = Math.min(50, Math.max(10, parseInt(searchParams.get("pageSize") ?? "20")));
  const status = searchParams.get("status");
  const keyword = searchParams.get("keyword")?.trim();
  const ownerId = searchParams.get("ownerId")?.trim();

  const where: Record<string, unknown> = {};
  if (user.role === "SALES") {
    where.ownerId = user.id;
  } else if (ownerId) {
    where.ownerId = ownerId;
  }
  if (status) where.status = status;
  if (keyword) {
    where.OR = [
      { companyName: { contains: keyword, mode: "insensitive" } },
      { contactName: { contains: keyword, mode: "insensitive" } },
      { contactPhone: { contains: keyword } },
    ];
  }

  const [data, total] = await Promise.all([
    prisma.lead.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        owner: { select: { id: true, name: true } },
        customer: { select: { id: true, name: true } },
      },
    }),
    prisma.lead.count({ where }),
  ]);

  return NextResponse.json({ data, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } });
}

const createSchema = z.object({
  companyName: z.string().min(1, "公司名称必填"),
  contactName: z.string().min(1, "联系人必填"),
  contactPhone: z.string().min(1, "电话必填"),
  wechat: z.string().optional(),
  region: z.string().optional(),
  source: z.string().optional(),
  industry: z.string().optional(),
  productNeed: z.string().optional(),
  intention: z.string().optional(),
  remark: z.string().optional(),
  ownerId: z.string().optional(),
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
    // SALES 只能给自己，ADMIN/MANAGER 可以指定
    const resolvedOwnerId = user.role === "SALES" ? user.id : (data.ownerId || user.id);

    const lead = await prisma.lead.create({
      data: {
        companyName: data.companyName.trim(),
        contactName: data.contactName.trim(),
        contactPhone: data.contactPhone.trim(),
        wechat: data.wechat?.trim() || null,
        region: data.region?.trim() || null,
        source: data.source?.trim() || null,
        industry: data.industry?.trim() || null,
        productNeed: data.productNeed?.trim() || null,
        intention: data.intention?.trim() || null,
        remark: data.remark?.trim() || null,
        status: "NEW",
        ownerId: resolvedOwnerId,
        createdById: user.id,
      },
      include: { owner: { select: { id: true, name: true } } },
    });

    return NextResponse.json({ data: lead }, { status: 201 });
  } catch (e) {
    console.error("Create lead error:", e);
    return NextResponse.json({ error: "创建失败" }, { status: 500 });
  }
}
