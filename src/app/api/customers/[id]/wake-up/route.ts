import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { customerOwnerFilter } from "@/lib/domestic/customer-access";
import { z } from "zod";

type RouteParams = { params: Promise<{ id: string }> };

const wakeUpSchema = z.object({
  note: z.string().optional(),
  nextFollowUpAt: z.string().optional(),
  channel: z.enum(["wechat", "phone", "both"]).optional(),
});

export async function POST(request: NextRequest, { params }: RouteParams) {
  const user = await getSession();
  if (!user || user.tenant !== "domestic") {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const { id } = await params;
  const customer = await prisma.customer.findFirst({
    where: { id, ...customerOwnerFilter(user) },
  });
  if (!customer) {
    return NextResponse.json({ error: "客户不存在" }, { status: 404 });
  }

  try {
    const body = await request.json();
    const parsed = wakeUpSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "参数错误" }, { status: 400 });
    }

    const data = parsed.data;
    const now = new Date();
    const channelLabel =
      data.channel === "wechat" ? "微信" : data.channel === "phone" ? "电话" : "微信+电话";
    const wakeNote = data.note?.trim()
      ? `[私域唤醒·${channelLabel}] ${data.note.trim()}`
      : `[私域唤醒·${channelLabel}] 已发起唤醒触达`;

    const updated = await prisma.customer.update({
      where: { id },
      data: {
        status: "AWAKENING",
        lastWakeUpAt: now,
        lastContactAt: now,
        wakeUpCount: { increment: 1 },
        nextFollowUpAt: data.nextFollowUpAt ? new Date(data.nextFollowUpAt) : null,
        remark: customer.remark ? `${customer.remark}\n${wakeNote}` : wakeNote,
      },
    });

    return NextResponse.json({ data: updated });
  } catch (e) {
    console.error("Wake up customer error:", e);
    return NextResponse.json({ error: "唤醒操作失败" }, { status: 500 });
  }
}
