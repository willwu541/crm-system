import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const { id } = await params;
  const opp = await prisma.opportunity.findFirst({
    where: {
      id,
      ...(user.role === "SALES" ? { createdById: user.id } : {}),
    },
    include: {
      customer: true,
      createdBy: { select: { name: true } },
      order: true,
    },
  });

  if (!opp) return NextResponse.json({ error: "商机不存在" }, { status: 404 });
  return NextResponse.json({ data: opp });
}

const updateSchema = z.object({
  projectName: z.string().min(1).optional(),
  status: z.enum(["OPPORTUNITY", "CONVERTED", "CANCELLED"]).optional(),
  isQuoted: z.boolean().optional(),
  intentionLevel: z.enum(["HIGH", "MEDIUM", "LOW"]).optional().nullable(),
  estimatedAmount: z.union([z.number(), z.string()]).optional().nullable(),
  remark: z.string().optional().nullable(),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const { id } = await params;
  const opp = await prisma.opportunity.findFirst({
    where: {
      id,
      ...(user.role === "SALES" ? { createdById: user.id } : {}),
    },
  });
  if (!opp) return NextResponse.json({ error: "商机不存在" }, { status: 404 });

  try {
    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "参数错误" },
        { status: 400 }
      );
    }

    const data = parsed.data as Record<string, unknown>;
    if (data.estimatedAmount !== undefined) {
      data.estimatedAmount = data.estimatedAmount ? Number(data.estimatedAmount) : null;
    }

    const updated = await prisma.opportunity.update({
      where: { id },
      data: data as never,
    });
    return NextResponse.json({ data: updated });
  } catch (e) {
    console.error("Update opportunity error:", e);
    return NextResponse.json({ error: "更新失败" }, { status: 500 });
  }
}
