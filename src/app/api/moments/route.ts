import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export async function GET() {
  const user = await getSession();
  if (!user || user.tenant !== "domestic") return NextResponse.json({ error: "未登录" }, { status: 401 });

  const moments = await prisma.moment.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    include: { createdBy: { select: { id: true, name: true } } },
  });

  return NextResponse.json({ data: moments });
}

const createSchema = z.object({
  content: z.string().min(1, "内容必填"),
  mediaUrls: z.array(z.string()).optional(),
  category: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const user = await getSession();
  if (!user || user.tenant !== "domestic") return NextResponse.json({ error: "未登录" }, { status: 401 });
  if (user.role === "SALES") return NextResponse.json({ error: "只有管理员和经理才能管理文案" }, { status: 403 });

  try {
    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "参数错误" }, { status: 400 });

    const data = parsed.data;
    const moment = await prisma.moment.create({
      data: {
        content: data.content.trim(),
        mediaUrls: data.mediaUrls || [],
        category: data.category?.trim() || null,
        createdById: user.id,
      },
    });

    return NextResponse.json({ data: moment }, { status: 201 });
  } catch (e) {
    console.error("Create moment error:", e);
    return NextResponse.json({ error: "创建失败" }, { status: 500 });
  }
}
