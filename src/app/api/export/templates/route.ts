import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireExportSession } from "@/lib/export/auth";
import { EMAIL_TEMPLATE_CATEGORIES, EMAIL_TEMPLATE_LANGUAGES } from "@/lib/export-constants";
import { z } from "zod";

export async function GET(request: NextRequest) {
  const { user, ctx, error } = await requireExportSession();
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category")?.trim();
  const language = searchParams.get("language")?.trim();
  const keyword = searchParams.get("keyword")?.trim();

  const where: Record<string, unknown> = {
    tenantId: ctx!.tenantId,
    OR: [
      { isShared: true },
      { createdById: user!.id },
    ],
  };
  if (category) where.category = category;
  if (language) where.language = language;
  if (keyword) {
    where.AND = [
      {
        OR: [
          { name: { contains: keyword, mode: "insensitive" } },
          { subject: { contains: keyword, mode: "insensitive" } },
        ],
      },
    ];
  }

  const data = await prisma.exportEmailTemplate.findMany({
    where,
    orderBy: [{ category: "asc" }, { language: "asc" }, { name: "asc" }],
    include: {
      createdBy: { select: { id: true, name: true } },
    },
  });
  return NextResponse.json({ data });
}

const createSchema = z.object({
  name: z.string().min(1, "请填写模板名称"),
  category: z.enum(EMAIL_TEMPLATE_CATEGORIES),
  language: z.enum(EMAIL_TEMPLATE_LANGUAGES).default("en"),
  subject: z.string().min(1, "请填写邮件主题"),
  body: z.string().min(1, "请填写邮件正文"),
  isShared: z.boolean().optional(),
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

    const created = await prisma.exportEmailTemplate.create({
      data: {
        tenantId: ctx!.tenantId,
        createdById: user!.id,
        name: parsed.data.name,
        category: parsed.data.category,
        language: parsed.data.language,
        subject: parsed.data.subject,
        body: parsed.data.body,
        isShared: parsed.data.isShared ?? true,
      },
      include: { createdBy: { select: { id: true, name: true } } },
    });
    return NextResponse.json({ data: created });
  } catch (e) {
    console.error("Create email template error:", e);
    return NextResponse.json({ error: "创建失败" }, { status: 500 });
  }
}
