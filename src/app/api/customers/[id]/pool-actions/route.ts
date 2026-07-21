import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const actionSchema = z.object({
  action: z.enum(["release_to_pool", "mark_lost"]),
  reason: z.string().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getSession();
  if (!user || user.tenant !== "domestic") {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const { id } = await params;
  const customer = await prisma.customer.findUnique({ where: { id } });
  if (!customer) {
    return NextResponse.json({ error: "客户不存在" }, { status: 404 });
  }

  // 只有ADMIN/MANAGER或客户负责人可以操作
  if (user.role === "SALES" && customer.ownerId !== user.id) {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const parsed = actionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "参数错误" }, { status: 400 });
    }

    const { action, reason } = parsed.data;

    if (action === "release_to_pool") {
      if (customer.isInPool) {
        return NextResponse.json({ error: "该客户已在公海中" }, { status: 400 });
      }

      const updated = await prisma.customer.update({
        where: { id },
        data: {
          isInPool: true,
          poolReleasedAt: new Date(),
          poolEnteredAt: new Date(),
          poolClaimedById: null,
          poolClaimedAt: null,
          isDealLost: false,
          remark: reason ? `${customer.remark || ""}\n释放原因：${reason}`.trim() : customer.remark,
        },
      });

      return NextResponse.json({ data: updated });
    }

    if (action === "mark_lost") {
      if (customer.isDealLost) {
        return NextResponse.json({ error: "该客户已标记为跑单" }, { status: 400 });
      }

      const updated = await prisma.customer.update({
        where: { id },
        data: {
          isDealLost: true,
          dealLostReason: reason || null,
          dealLostAt: new Date(),
          isInPool: true,
          poolEnteredAt: new Date(),
          poolReleasedAt: new Date(),
          poolClaimedById: null,
          poolClaimedAt: null,
          status: "LOST",
        },
      });

      return NextResponse.json({ data: updated });
    }

    return NextResponse.json({ error: "未知操作" }, { status: 400 });
  } catch (e) {
    console.error("Pool action error:", e);
    return NextResponse.json({ error: "操作失败" }, { status: 500 });
  }
}
