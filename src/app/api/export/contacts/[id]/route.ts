import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireExportSession } from "@/lib/export/auth";
import { deleteWithExportLog } from "@/lib/export/deletion-log";
import { z } from "zod";

async function getContactOrError(id: string, tenantId: string, ownerFilter?: { ownerId: string }) {
  const contact = await prisma.exportContact.findUnique({
    where: { id, tenantId },
    include: { customer: true },
  });
  if (!contact) return { contact: null, error: NextResponse.json({ error: "联系人不存在" }, { status: 404 }) };
  if (ownerFilter && contact.customer.ownerId !== ownerFilter.ownerId) {
    return { contact: null, error: NextResponse.json({ error: "无权限" }, { status: 403 }) };
  }
  return { contact, error: null };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { ctx, error } = await requireExportSession();
  if (error) return error;
  const { id } = await params;
  const { contact, error: err } = await getContactOrError(id, ctx!.tenantId, ctx!.ownerFilter);
  if (err) return err;
  return NextResponse.json({ data: contact });
}

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  title: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
  linkedin: z.string().optional(),
  facebook: z.string().optional(),
  tiktok: z.string().optional(),
  language: z.string().optional(),
  isPrimary: z.boolean().optional(),
  notes: z.string().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { ctx, error } = await requireExportSession();
  if (error) return error;
  const { id } = await params;
  const { contact, error: err } = await getContactOrError(id, ctx!.tenantId, ctx!.ownerFilter);
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

    if (parsed.data.isPrimary) {
      await prisma.exportContact.updateMany({
        where: { customerId: contact!.customerId, tenantId: ctx!.tenantId },
        data: { isPrimary: false },
      });
    }

    const updated = await prisma.exportContact.update({
      where: { id, tenantId: ctx!.tenantId },
      data: parsed.data,
    });
    return NextResponse.json({ data: updated });
  } catch (e) {
    console.error("Update contact error:", e);
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
  const { error: err } = await getContactOrError(id, ctx!.tenantId, ctx!.ownerFilter);
  if (err) return err;

  const full = await prisma.exportContact.findUnique({
    where: { id, tenantId: ctx!.tenantId },
    include: { customer: { select: { id: true, companyName: true, customerCode: true } } },
  });
  if (!full) return NextResponse.json({ error: "联系人不存在" }, { status: 404 });

  try {
    await deleteWithExportLog({
      tenantId: ctx!.tenantId,
      entityType: "contact",
      recordId: id,
      summary: `${full.name} · ${full.customer.companyName}`,
      snapshot: full,
      deletedById: user!.id,
      deleteFn: (tx) => tx.exportContact.delete({ where: { id, tenantId: ctx!.tenantId } }),
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Delete contact error:", e);
    return NextResponse.json({ error: "删除失败" }, { status: 500 });
  }
}
