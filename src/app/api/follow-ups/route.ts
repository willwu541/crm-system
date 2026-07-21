import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export async function GET(request: NextRequest) {
  const user = await getSession();
  if (!user || user.tenant !== "domestic") return NextResponse.json({ error: "未登录" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const customerId = searchParams.get("customerId");
  if (!customerId) return NextResponse.json({ error: "缺少customerId" }, { status: 400 });

  const followUps = await prisma.followUp.findMany({
    where: { customerId },
    orderBy: { createdAt: "desc" },
    include: { createdBy: { select: { id: true, name: true } } },
    take: 50,
  });

  return NextResponse.json({ data: followUps });
}

const createSchema = z.object({
  customerId: z.string().min(1),
  content: z.string().min(1, "内容不能为空"),
  type: z.enum(["call", "visit", "wechat", "note", "email"]).default("call"),
  outcome: z.string().optional(),
  nextPlan: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const user = await getSession();
  if (!user || user.tenant !== "domestic") return NextResponse.json({ error: "未登录" }, { status: 401 });

  try {
    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "参数错误" }, { status: 400 });

    const data = parsed.data;

    // 同时更新客户最后联系时间和下次跟进时间
    const [followUp] = await Promise.all([
      prisma.followUp.create({
        data: {
          customerId: data.customerId,
          content: data.content.trim(),
          type: data.type,
          outcome: data.outcome?.trim() || null,
          nextPlan: data.nextPlan?.trim() || null,
          createdById: user.id,
        },
        include: { createdBy: { select: { id: true, name: true } } },
      }),
      prisma.customer.update({
        where: { id: data.customerId },
        data: {
          lastContactAt: new Date(),
          lastFollowUpAt: new Date(),
          ...(data.nextPlan?.trim() ? {
            nextFollowUpAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 默认下次3天后
          } : {}),
        },
      }),
    ]);

    return NextResponse.json({ data: followUp }, { status: 201 });
  } catch (e) {
    console.error("Create follow-up error:", e);
    return NextResponse.json({ error: "创建失败" }, { status: 500 });
  }
}
