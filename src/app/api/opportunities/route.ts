import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export async function GET(request: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const keyword = searchParams.get("keyword")?.trim();

  const where: Record<string, unknown> = {};
  if (user.role === "SALES") where.createdById = user.id;
  if (status && ["OPPORTUNITY", "CONVERTED", "CANCELLED"].includes(status)) {
    where.status = status;
  }
  if (keyword) {
    where.OR = [
      { projectName: { contains: keyword, mode: "insensitive" } },
      { customer: { name: { contains: keyword, mode: "insensitive" } } },
    ];
  }

  const opportunities = await prisma.opportunity.findMany({
    where,
    include: {
      customer: { select: { name: true } },
      createdBy: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json({ data: opportunities });
}

const createSchema = z.object({
  customerId: z.string().min(1, "请选择客户"),
  projectName: z.string().min(1, "项目名称必填"),
  isQuoted: z.boolean().optional(),
  intentionLevel: z.enum(["HIGH", "MEDIUM", "LOW"]).optional(),
  estimatedAmount: z.union([z.number(), z.string()]).optional(),
  remark: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  try {
    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "参数错误" },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const opp = await prisma.opportunity.create({
      data: {
        customerId: data.customerId,
        projectName: data.projectName,
        isQuoted: data.isQuoted ?? false,
        intentionLevel: data.intentionLevel ?? null,
        estimatedAmount: data.estimatedAmount ? Number(data.estimatedAmount) : null,
        remark: data.remark ?? null,
        createdById: user.id,
      },
      include: {
        customer: { select: { name: true } },
      },
    });
    return NextResponse.json({ data: opp });
  } catch (e) {
    console.error("Create opportunity error:", e);
    return NextResponse.json({ error: "创建失败" }, { status: 500 });
  }
}
