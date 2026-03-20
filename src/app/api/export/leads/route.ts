import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireExportSession } from "@/lib/export/auth";
import { z } from "zod";

export async function GET(request: NextRequest) {
  const { ctx, error } = await requireExportSession();
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const pageSize = Math.min(50, Math.max(10, parseInt(searchParams.get("pageSize") ?? "20")));
  const keyword = searchParams.get("keyword")?.trim();
  const status = searchParams.get("status")?.trim();
  const country = searchParams.get("country")?.trim();
  const ownerId = searchParams.get("ownerId")?.trim();
  const since = searchParams.get("since")?.trim();
  const sortBy = searchParams.get("sortBy") ?? "createdAt";
  const sortOrder = searchParams.get("sortOrder") ?? "desc";

  const where: Record<string, unknown> = { tenantId: ctx!.tenantId };
  if (ownerId) where.ownerId = ownerId;
  else if (ctx!.ownerFilter) where.ownerId = ctx!.ownerFilter.ownerId;
  if (status) where.status = status;
  if (country) where.country = { contains: country, mode: "insensitive" };
  if (since === "week") {
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 7);
    where.createdAt = { gte: weekStart };
  }
  if (keyword) {
    where.OR = [
      { companyName: { contains: keyword, mode: "insensitive" } },
      { email: { contains: keyword, mode: "insensitive" } },
      { phone: { contains: keyword, mode: "insensitive" } },
    ];
  }

  const [data, total] = await Promise.all([
    prisma.exportLead.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { owner: { select: { id: true, name: true } } },
    }),
    prisma.exportLead.count({ where }),
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
  website: z.string().optional(),
  country: z.string().optional(),
  city: z.string().optional(),
  address: z.string().optional(),
  customerType: z.string().optional(),
  sourceChannel: z.string().optional(),
  sourceKeyword: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
  linkedin: z.string().optional(),
  mainBusiness: z.string().optional(),
  productInterest: z.string().optional(),
  priority: z.string().optional(),
  status: z.string().optional(),
  notes: z.string().optional(),
  /** 仅管理员：分配给业务员 */
  ownerId: z.string().optional(),
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

    const { ownerId: bodyOwnerId, ...rest } = parsed.data;
    let ownerId = user!.id;
    if (user!.role === "ADMIN" && bodyOwnerId) {
      const assignee = await prisma.user.findFirst({
        where: { id: bodyOwnerId, tenant: "export", tenantId: ctx!.tenantId },
        select: { id: true },
      });
      if (assignee) ownerId = assignee.id;
    }

    const lead = await prisma.exportLead.create({
      data: {
        ...rest,
        tenantId: ctx!.tenantId,
        ownerId,
        status: parsed.data.status ?? "new",
      },
      include: { owner: { select: { id: true, name: true } } },
    });
    return NextResponse.json({ data: lead });
  } catch (e) {
    console.error("Create lead error:", e);
    return NextResponse.json({ error: "创建失败" }, { status: 500 });
  }
}
