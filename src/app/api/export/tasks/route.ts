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
  const status = searchParams.get("status")?.trim();
  const due = searchParams.get("due")?.trim();
  const customerId = searchParams.get("customerId")?.trim();
  const ownerId = searchParams.get("ownerId")?.trim();
  const keyword = searchParams.get("keyword")?.trim();
  const sortByRaw = searchParams.get("sortBy") ?? "dueDate";
  const sortOrder = searchParams.get("sortOrder") === "desc" ? "desc" : "asc";
  const allowedSort = new Set([
    "createdAt",
    "updatedAt",
    "dueDate",
    "priority",
    "status",
    "title",
  ]);
  const sortBy = allowedSort.has(sortByRaw) ? sortByRaw : "dueDate";

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

  const where: Record<string, unknown> = { tenantId: ctx!.tenantId };
  if (ownerId) where.ownerId = ownerId;
  else if (ctx!.ownerFilter) where.ownerId = ctx!.ownerFilter.ownerId;
  if (keyword) {
    where.OR = [
      { title: { contains: keyword, mode: "insensitive" } },
      { notes: { contains: keyword, mode: "insensitive" } },
    ];
  }
  if (due === "today") {
    where.dueDate = { gte: todayStart, lt: todayEnd };
  } else if (status === "overdue") {
    where.status = { in: ["todo", "in_progress"] };
    where.dueDate = { lt: todayStart };
  } else if (status) {
    where.status = status;
  }
  if (customerId) where.customerId = customerId;

  const [data, total] = await Promise.all([
    prisma.exportTask.findMany({
      where,
      orderBy:
        sortBy === "dueDate"
          ? [{ dueDate: sortOrder }, { createdAt: "desc" }]
          : { [sortBy]: sortOrder },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        owner: { select: { id: true, name: true } },
        customer: { select: { id: true, companyName: true } },
        contact: { select: { id: true, name: true } },
      },
    }),
    prisma.exportTask.count({ where }),
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
  title: z.string().min(1),
  customerId: z.string().optional().nullable(),
  contactId: z.string().optional().nullable(),
  dueDate: z.string().optional().nullable(),
  priority: z.string().optional(),
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

    if (parsed.data.customerId) {
      const customer = await prisma.exportCustomer.findUnique({
        where: { id: parsed.data.customerId, tenantId: ctx!.tenantId },
      });
      if (!customer) return NextResponse.json({ error: "客户不存在" }, { status: 404 });
      if (ctx!.ownerFilter && customer.ownerId !== ctx!.ownerFilter.ownerId) {
        return NextResponse.json({ error: "无权限" }, { status: 403 });
      }
    }

    const task = await prisma.exportTask.create({
      data: {
        ...parsed.data,
        tenantId: ctx!.tenantId,
        ownerId: user!.id,
        priority: parsed.data.priority ?? "medium",
        status: parsed.data.status ?? "todo",
        dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : undefined,
      },
      include: {
        owner: { select: { id: true, name: true } },
        customer: { select: { id: true, companyName: true } },
        contact: { select: { id: true, name: true } },
      },
    });
    return NextResponse.json({ data: task });
  } catch (e) {
    console.error("Create task error:", e);
    return NextResponse.json({ error: "创建失败" }, { status: 500 });
  }
}
