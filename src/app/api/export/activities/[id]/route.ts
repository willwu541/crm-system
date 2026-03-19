import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireExportSession } from "@/lib/export/auth";
import { z } from "zod";

async function getActivityOrError(id: string, tenantId: string, ownerFilter?: { ownerId: string }) {
  const activity = await prisma.exportActivity.findUnique({
    where: { id, tenantId },
    include: { customer: true, contact: true, owner: true },
  });
  if (!activity) return { activity: null, error: NextResponse.json({ error: "跟进记录不存在" }, { status: 404 }) };
  if (ownerFilter && activity.customer.ownerId !== ownerFilter.ownerId) {
    return { activity: null, error: NextResponse.json({ error: "无权限" }, { status: 403 }) };
  }
  return { activity, error: null };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { ctx, error } = await requireExportSession();
  if (error) return error;
  const { id } = await params;
  const { activity, error: err } = await getActivityOrError(id, ctx!.tenantId, ctx!.ownerFilter);
  if (err) return err;
  return NextResponse.json({ data: activity });
}

const updateSchema = z.object({
  type: z.string().optional(),
  subject: z.string().optional(),
  content: z.string().optional(),
  customerFeedback: z.string().optional(),
  nextFollowUpAt: z.string().datetime().optional().nullable(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { ctx, error } = await requireExportSession();
  if (error) return error;
  const { id } = await params;
  const { activity, error: err } = await getActivityOrError(id, ctx!.tenantId, ctx!.ownerFilter);
  if (err) return err;

  try {
    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "参数错误" },
        { status: 400 }
      );
    }

    const data: Record<string, unknown> = { ...parsed.data };
    if (parsed.data.nextFollowUpAt !== undefined) {
      data.nextFollowUpAt = parsed.data.nextFollowUpAt ? new Date(parsed.data.nextFollowUpAt) : null;
    }

    const updated = await prisma.exportActivity.update({
      where: { id, tenantId: ctx!.tenantId },
      data,
      include: { contact: true, owner: { select: { id: true, name: true } } },
    });
    return NextResponse.json({ data: updated });
  } catch (e) {
    console.error("Update activity error:", e);
    return NextResponse.json({ error: "更新失败" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { ctx, error } = await requireExportSession();
  if (error) return error;
  const { id } = await params;
  const { error: err } = await getActivityOrError(id, ctx!.tenantId, ctx!.ownerFilter);
  if (err) return err;

  await prisma.exportActivity.delete({ where: { id, tenantId: ctx!.tenantId } });
  return NextResponse.json({ ok: true });
}
