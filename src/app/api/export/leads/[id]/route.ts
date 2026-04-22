import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireExportSession } from "@/lib/export/auth";
import { deleteWithExportLog } from "@/lib/export/deletion-log";
import { getExportDuplicateMessage } from "@/lib/export/dedupe";
import { prismaErrorToUserMessage } from "@/lib/prisma-user-message";
import { z } from "zod";

async function getLeadOrError(id: string, tenantId: string, ownerFilter?: { ownerId: string }) {
  const lead = await prisma.exportLead.findUnique({
    where: { id, tenantId },
    include: { owner: { select: { id: true, name: true } }, customer: true },
  });
  if (!lead) return { lead: null, error: NextResponse.json({ error: "线索不存在" }, { status: 404 }) };
  if (ownerFilter && lead.ownerId !== ownerFilter.ownerId) {
    return { lead: null, error: NextResponse.json({ error: "无权限" }, { status: 403 }) };
  }
  return { lead, error: null };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { ctx, error } = await requireExportSession();
  if (error) return error;
  const { id } = await params;
  const { lead, error: err } = await getLeadOrError(id, ctx!.tenantId, ctx!.ownerFilter);
  if (err) return err;
  return NextResponse.json({ data: lead });
}

const updateSchema = z.object({
  companyName: z.string().min(1).optional(),
  website: z.string().optional(),
  country: z.string().optional(),
  city: z.string().optional(),
  address: z.string().optional(),
  customerType: z.string().optional(),
  sourceChannel: z.string().optional(),
  sourceKeyword: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
  linkedin: z.string().optional(),
  mainBusiness: z.string().optional(),
  productInterest: z.string().optional().nullable(),
  priority: z.string().optional(),
  status: z.string().optional(),
  notes: z.string().optional(),
  /** 仅管理员：改派负责人 */
  ownerId: z.string().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, ctx, error } = await requireExportSession();
  if (error) return error;
  const { id } = await params;
  const { lead, error: err } = await getLeadOrError(id, ctx!.tenantId, ctx!.ownerFilter);
  if (err) return err;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求体无效或为空" }, { status: 400 });
  }

  try {
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "参数错误" },
        { status: 400 }
      );
    }

    const { ownerId: nextOwnerId, ...rest } = parsed.data;
    const data: Record<string, unknown> = { ...rest };

    if (user!.role === "ADMIN" && nextOwnerId !== undefined) {
      if (nextOwnerId) {
        const assignee = await prisma.user.findFirst({
          where: { id: nextOwnerId, tenant: "export", tenantId: ctx!.tenantId },
          select: { id: true },
        });
        if (!assignee) {
          return NextResponse.json({ error: "负责人不存在或不属于本租户" }, { status: 400 });
        }
        data.ownerId = nextOwnerId;
      }
    }

    const duplicateMessage = await getExportDuplicateMessage({
      tenantId: ctx!.tenantId,
      companyName: parsed.data.companyName ?? lead.companyName,
      website: parsed.data.website ?? lead.website,
      email: parsed.data.email ?? lead.email,
      phone: parsed.data.phone ?? parsed.data.whatsapp ?? lead.phone ?? lead.whatsapp,
      exclude: {
        leadId: id,
        linkedCustomerId: lead.convertedToCustomerId,
      },
    });
    if (duplicateMessage) {
      return NextResponse.json({ error: duplicateMessage }, { status: 400 });
    }

    const updated = await prisma.exportLead.update({
      where: { id, tenantId: ctx!.tenantId },
      data,
      include: { owner: { select: { id: true, name: true } } },
    });
    return NextResponse.json({ data: updated });
  } catch (e) {
    console.error("Update lead error:", e);
    const msg = prismaErrorToUserMessage(e, "更新失败，请稍后重试。");
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, ctx, error } = await requireExportSession();
  if (error) return error;
  const { id } = await params;
  const { lead, error: err } = await getLeadOrError(id, ctx!.tenantId, ctx!.ownerFilter);
  if (err) return err;

  const full = await prisma.exportLead.findUnique({
    where: { id, tenantId: ctx!.tenantId },
    include: {
      owner: { select: { id: true, name: true, email: true } },
      customer: { select: { id: true, companyName: true, customerCode: true } },
    },
  });
  if (!full) return NextResponse.json({ error: "线索不存在" }, { status: 404 });

  try {
    await deleteWithExportLog({
      tenantId: ctx!.tenantId,
      entityType: "lead",
      recordId: id,
      summary: full.companyName,
      snapshot: full,
      deletedById: user!.id,
      deleteFn: (tx) => tx.exportLead.delete({ where: { id, tenantId: ctx!.tenantId } }),
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Delete lead error:", e);
    return NextResponse.json({ error: "删除失败" }, { status: 500 });
  }
}
