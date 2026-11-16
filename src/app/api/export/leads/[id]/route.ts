import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireExportSession } from "@/lib/export/auth";
import type { SessionUser } from "@/lib/auth";
import { canViewExportLead, canWorkExportLead, presentExportLead } from "@/lib/export/lead-pool";
import {
  DEFER_MARK_TEXT,
  DEFER_UNMARK_TEXT,
  LEAD_LIFECYCLE_ACTIVITY,
  deferStatusChange,
} from "@/lib/export/defer-development";
import { LEAD_STATUSES } from "@/lib/export-constants";
import { deleteWithExportLog } from "@/lib/export/deletion-log";
import { exportDuplicateConflictBody, findExportDuplicate } from "@/lib/export/dedupe";
import { prismaErrorToUserMessage } from "@/lib/prisma-user-message";
import { z } from "zod";
import { nullifyBlankFields } from "@/lib/export/blank-to-null";

async function getLeadOrError(
  id: string,
  tenantId: string,
  user: Pick<SessionUser, "id" | "role">,
  mode: "view" | "work",
) {
  const lead = await prisma.exportLead.findUnique({
    where: { id, tenantId },
    include: { owner: { select: { id: true, name: true } }, customer: true },
  });
  if (!lead) return { lead: null, error: NextResponse.json({ error: "线索不存在" }, { status: 404 }) };
  const allowed = mode === "work" ? canWorkExportLead(user, lead.ownerId) : canViewExportLead(user, lead.ownerId);
  if (!allowed) {
    return {
      lead: null,
      error: NextResponse.json(
        { error: mode === "work" ? "请先认领这条线索，再进行开发" : "无权限" },
        { status: 403 },
      ),
    };
  }
  return { lead, error: null };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, ctx, error } = await requireExportSession();
  if (error) return error;
  const { id } = await params;
  const { lead, error: err } = await getLeadOrError(id, ctx!.tenantId, user!, "view");
  if (err) return err;
  return NextResponse.json({ data: presentExportLead(lead!, user!) });
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
  email: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  whatsapp: z.string().optional().nullable(),
  linkedin: z.string().optional().nullable(),
  facebook: z.string().optional().nullable(),
  tiktok: z.string().optional().nullable(),
  mainBusiness: z.string().optional(),
  productInterest: z.string().optional().nullable(),
  nextFollowUpAt: z.string().datetime().optional().nullable(),
  priority: z.string().optional(),
  status: z.string().optional(),
  resumeParked: z.literal(true).optional(),
  notes: z.string().optional(),
  fitEvidence: z.string().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, ctx, error } = await requireExportSession();
  if (error) return error;
  const { id } = await params;
  const { lead, error: err } = await getLeadOrError(id, ctx!.tenantId, user!, "view");
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

    const { nextFollowUpAt, resumeParked, status, ...rest } = parsed.data;
    const inPool = !lead!.ownerId;
    if (!inPool && !canWorkExportLead(user!, lead!.ownerId)) {
      return NextResponse.json({ error: "请先认领这条线索，再进行开发" }, { status: 403 });
    }
    const touchesDefer = resumeParked === true || status === "parked" || (status !== undefined && lead!.status === "parked");
    if (touchesDefer && !canWorkExportLead(user!, lead!.ownerId)) {
      return NextResponse.json({ error: "只有负责人和管理者可以把线索标为暂缓开发" }, { status: 403 });
    }
    if (status === "parked" && lead!.status === "converted") {
      return NextResponse.json({ error: "已转化的线索不能暂缓开发" }, { status: 400 });
    }

    const deferred = deferStatusChange({
      currentStatus: lead!.status,
      parkedFromStatus: lead!.parkedFromStatus,
      requestedStatus: resumeParked ? undefined : status,
      resume: resumeParked,
      allowed: LEAD_STATUSES,
      fallback: "new",
    });

    const data: Record<string, unknown> = nullifyBlankFields({ ...rest });
    if (deferred.status !== undefined) data.status = deferred.status;
    if (deferred.parkedFromStatus !== undefined) data.parkedFromStatus = deferred.parkedFromStatus;
    if (nextFollowUpAt !== undefined) {
      data.nextFollowUpAt = nextFollowUpAt ? new Date(nextFollowUpAt) : null;
    }

    const duplicate = await findExportDuplicate({
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
    if (duplicate) {
      return NextResponse.json(exportDuplicateConflictBody(duplicate, user!), { status: 400 });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const row = await tx.exportLead.update({
        where: { id, tenantId: ctx!.tenantId },
        data,
        include: { owner: { select: { id: true, name: true } } },
      });
      if (deferred.log) {
        await tx.exportActivity.create({
          data: {
            tenantId: ctx!.tenantId,
            leadId: id,
            type: LEAD_LIFECYCLE_ACTIVITY,
            direction: "inbound",
            content: deferred.log === "mark" ? DEFER_MARK_TEXT : DEFER_UNMARK_TEXT,
            customerNameSnapshot: row.companyName,
            ownerId: user!.id,
          },
        });
      }
      return row;
    });
    return NextResponse.json({ data: presentExportLead(updated, user!) });
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
  const { lead, error: err } = await getLeadOrError(id, ctx!.tenantId, user!, "work");
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
