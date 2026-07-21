import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

// GET: 列出公海中的客户
export async function GET(request: NextRequest) {
  const user = await getSession();
  if (!user || user.tenant !== "domestic") {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const pageSize = Math.min(50, Math.max(10, parseInt(searchParams.get("pageSize") ?? "20")));
  const keyword = searchParams.get("keyword")?.trim();

  const where: Record<string, unknown> = { isInPool: true };
  if (keyword) {
    where.OR = [
      { name: { contains: keyword, mode: "insensitive" } },
      { contactName: { contains: keyword, mode: "insensitive" } },
      { contactPhone: { contains: keyword } },
    ];
  }

  const [data, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      orderBy: { poolEnteredAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        owner: { select: { id: true, name: true } },
      },
    }),
    prisma.customer.count({ where }),
  ]);

  return NextResponse.json({
    data,
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  });
}

const claimSchema = z.object({
  customerId: z.string().min(1),
});

// POST: 认领公海客户
export async function POST(request: NextRequest) {
  const user = await getSession();
  if (!user || user.tenant !== "domestic") {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = claimSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "参数错误" }, { status: 400 });
    }

    const customer = await prisma.customer.findUnique({ where: { id: parsed.data.customerId } });
    if (!customer) {
      return NextResponse.json({ error: "客户不存在" }, { status: 404 });
    }
    if (!customer.isInPool) {
      return NextResponse.json({ error: "该客户不在公海中" }, { status: 400 });
    }

    const updated = await prisma.customer.update({
      where: { id: customer.id },
      data: {
        isInPool: false,
        ownerId: user.id,
        poolClaimedById: user.id,
        poolClaimedAt: new Date(),
        poolReleasedAt: null,
        lastFollowUpAt: new Date(),
        isDealLost: false,
        dealLostReason: null,
        dealLostAt: null,
        status: "ACTIVE",
      },
    });

    return NextResponse.json({ data: updated });
  } catch (e) {
    console.error("Claim customer error:", e);
    return NextResponse.json({ error: "认领失败" }, { status: 500 });
  }
}
