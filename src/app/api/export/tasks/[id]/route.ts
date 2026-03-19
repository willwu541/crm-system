import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireExportSession } from "@/lib/export/auth";
import { z } from "zod";

async function getTaskOrError(id: string, tenantId: string, ownerFilter?: { ownerId: string }) {
  const task = await prisma.exportTask.findUnique({
    where: { id, tenantId },
    include: { customer: true, contact: true, owner: true },
  });
  if (!task) return { task: null, error: NextResponse.json({ error: "任务不存在" }, { status: 404 }) };
  if (ownerFilter && task.ownerId !== ownerFilter.ownerId) {
    return { task: null, error: NextResponse.json({ error: "无权限" }, { status: 403 }) };
  }
  return { task, error: null };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { ctx, error } = await requireExportSession();
  if (error) return error;
  const { id } = await params;
  const { task, error: err } = await getTaskOrError(id, ctx!.tenantId, ctx!.ownerFilter);
  if (err) return err;
  return NextResponse.json({ data: task });
}

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  customerId: z.string().optional().nullable(),
  contactId: z.string().optional().nullable(),
  dueDate: z.string().optional().nullable(),
  priority: z.string().optional(),
  status: z.string().optional(),
  notes: z.string().optional().nullable(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { ctx, error } = await requireExportSession();
  if (error) return error;
  const { id } = await params;
  const { task, error: err } = await getTaskOrError(id, ctx!.tenantId, ctx!.ownerFilter);
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
    if (parsed.data.dueDate !== undefined) data.dueDate = parsed.data.dueDate ? new Date(parsed.data.dueDate) : null;

    const updated = await prisma.exportTask.update({
      where: { id, tenantId: ctx!.tenantId },
      data,
      include: {
        owner: { select: { id: true, name: true } },
        customer: { select: { id: true, companyName: true } },
        contact: { select: { id: true, name: true } },
      },
    });
    return NextResponse.json({ data: updated });
  } catch (e) {
    console.error("Update task error:", e);
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
  const { error: err } = await getTaskOrError(id, ctx!.tenantId, ctx!.ownerFilter);
  if (err) return err;

  await prisma.exportTask.delete({ where: { id, tenantId: ctx!.tenantId } });
  return NextResponse.json({ ok: true });
}
