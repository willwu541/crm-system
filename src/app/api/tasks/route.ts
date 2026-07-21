import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export async function GET(request: NextRequest) {
  const user = await getSession();
  if (!user || user.tenant !== "domestic") return NextResponse.json({ error: "未登录" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") || "todo";
  const type = searchParams.get("type");

  const where: Record<string, unknown> = { ownerId: user.id, status };
  if (type) where.type = type;

  const tasks = await prisma.task.findMany({
    where,
    orderBy: [{ priority: "asc" }, { dueDate: "asc" }, { createdAt: "desc" }],
    take: 100,
    include: {
      customer: { select: { id: true, name: true } },
      lead: { select: { id: true, companyName: true } },
    },
  });

  return NextResponse.json({ data: tasks });
}

const createSchema = z.object({
  title: z.string().min(1),
  type: z.string().optional(),
  customerId: z.string().optional(),
  leadId: z.string().optional(),
  dueDate: z.string().optional(),
  priority: z.enum(["HIGH", "MEDIUM", "LOW"]).optional(),
  notes: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const user = await getSession();
  if (!user || user.tenant !== "domestic") return NextResponse.json({ error: "未登录" }, { status: 401 });

  try {
    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "参数错误" }, { status: 400 });

    const data = parsed.data;
    const task = await prisma.task.create({
      data: {
        title: data.title.trim(),
        type: data.type || "general",
        customerId: data.customerId || null,
        leadId: data.leadId || null,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        priority: data.priority || "MEDIUM",
        notes: data.notes?.trim() || null,
        ownerId: user.id,
      },
    });

    return NextResponse.json({ data: task }, { status: 201 });
  } catch (e) {
    console.error("Create task error:", e);
    return NextResponse.json({ error: "创建失败" }, { status: 500 });
  }
}
