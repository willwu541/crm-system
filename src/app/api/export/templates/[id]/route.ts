import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireExportSession } from "@/lib/export/auth";
import { EMAIL_TEMPLATE_CATEGORIES, EMAIL_TEMPLATE_LANGUAGES } from "@/lib/export-constants";
import { z } from "zod";

async function findTemplateOrError(id: string, tenantId: string, userId: string) {
  const template = await prisma.exportEmailTemplate.findUnique({
    where: { id, tenantId },
    include: { createdBy: { select: { id: true, name: true } } },
  });
  if (!template) {
    return { template: null, error: NextResponse.json({ error: "模板不存在" }, { status: 404 }) };
  }
  // 私有模板只有创建者可见
  if (!template.isShared && template.createdById !== userId) {
    return { template: null, error: NextResponse.json({ error: "无权限" }, { status: 403 }) };
  }
  return { template, error: null };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, ctx, error } = await requireExportSession();
  if (error) return error;
  const { id } = await params;
  const { template, error: err } = await findTemplateOrError(id, ctx!.tenantId, user!.id);
  if (err) return err;
  return NextResponse.json({ data: template });
}

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  category: z.enum(EMAIL_TEMPLATE_CATEGORIES).optional(),
  language: z.enum(EMAIL_TEMPLATE_LANGUAGES).optional(),
  subject: z.string().min(1).optional(),
  body: z.string().min(1).optional(),
  isShared: z.boolean().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, ctx, error } = await requireExportSession();
  if (error) return error;
  const { id } = await params;
  const { template, error: err } = await findTemplateOrError(id, ctx!.tenantId, user!.id);
  if (err) return err;

  // 只有创建人或管理员可修改
  if (template!.createdById !== user!.id && user!.role !== "ADMIN") {
    return NextResponse.json({ error: "只有模板创建人或管理员可修改" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "参数错误" },
        { status: 400 }
      );
    }

    const updated = await prisma.exportEmailTemplate.update({
      where: { id, tenantId: ctx!.tenantId },
      data: parsed.data,
      include: { createdBy: { select: { id: true, name: true } } },
    });
    return NextResponse.json({ data: updated });
  } catch (e) {
    console.error("Update email template error:", e);
    return NextResponse.json({ error: "更新失败" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, ctx, error } = await requireExportSession();
  if (error) return error;
  const { id } = await params;
  const { template, error: err } = await findTemplateOrError(id, ctx!.tenantId, user!.id);
  if (err) return err;

  if (template!.isBuiltin) {
    return NextResponse.json({ error: "内置模板不可删除（可复制后修改）" }, { status: 400 });
  }
  if (template!.createdById !== user!.id && user!.role !== "ADMIN") {
    return NextResponse.json({ error: "只有模板创建人或管理员可删除" }, { status: 403 });
  }

  try {
    await prisma.exportEmailTemplate.delete({ where: { id, tenantId: ctx!.tenantId } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Delete email template error:", e);
    return NextResponse.json({ error: "删除失败" }, { status: 500 });
  }
}
