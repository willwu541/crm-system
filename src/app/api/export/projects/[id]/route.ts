import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireExportSession } from "@/lib/export/auth";
import { deleteWithExportLog } from "@/lib/export/deletion-log";
import { prismaErrorToUserMessage } from "@/lib/prisma-user-message";
import { canonicalizeCountry } from "@/lib/export/countries";
import { PROJECT_CONFIDENCE, PROJECT_INDUSTRIES, PROJECT_STAGES, PROJECT_STATUSES } from "@/lib/export-constants";
import {
  PROJECT_DETAIL_INCLUDE,
  getProjectOrError,
  parseOptionalDate,
  resolveExportOwnerId,
} from "@/lib/export/projects";
import { z } from "zod";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { ctx, error } = await requireExportSession();
  if (error) return error;
  const { id } = await params;
  const { project, error: err } = await getProjectOrError(id, ctx!.tenantId);
  if (err) return err;
  return NextResponse.json({ data: project });
}

const updateSchema = z.object({
  name: z.string().trim().min(1, "请填写项目名称").optional(),
  country: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  industry: z.enum(PROJECT_INDUSTRIES).optional().nullable(),
  stage: z.enum(PROJECT_STAGES).optional(),
  confidence: z.enum(PROJECT_CONFIDENCE).optional(),
  ownerOperator: z.string().optional().nullable(),
  generalContractor: z.string().optional().nullable(),
  potentialBuyers: z.string().optional().nullable(),
  productNeed: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  source: z.string().optional().nullable(),
  tenderUrl: z.string().optional().nullable(),
  status: z.enum(PROJECT_STATUSES).optional(),
  bidDeadline: z.string().optional().nullable(),
  ownerId: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { ctx, error } = await requireExportSession();
  if (error) return error;
  const { id } = await params;
  const { error: err } = await getProjectOrError(id, ctx!.tenantId);
  if (err) return err;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求体无效或为空，请刷新页面后重试" }, { status: 400 });
  }

  try {
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "参数错误" },
        { status: 400 },
      );
    }

    const data: Record<string, unknown> = {};
    if (parsed.data.name !== undefined) data.name = parsed.data.name;
    if (parsed.data.country !== undefined) {
      data.country =
        canonicalizeCountry(parsed.data.country ?? "") || parsed.data.country?.trim() || null;
    }
    if (parsed.data.city !== undefined) data.city = parsed.data.city?.trim() || null;
    if (parsed.data.location !== undefined) data.location = parsed.data.location?.trim() || null;
    if (parsed.data.industry !== undefined) data.industry = parsed.data.industry || null;
    if (parsed.data.stage !== undefined) data.stage = parsed.data.stage;
    if (parsed.data.confidence !== undefined) data.confidence = parsed.data.confidence;
    if (parsed.data.ownerOperator !== undefined) data.ownerOperator = parsed.data.ownerOperator?.trim() || null;
    if (parsed.data.generalContractor !== undefined) {
      data.generalContractor = parsed.data.generalContractor?.trim() || null;
    }
    if (parsed.data.potentialBuyers !== undefined) {
      data.potentialBuyers = parsed.data.potentialBuyers?.trim() || null;
    }
    if (parsed.data.productNeed !== undefined) data.productNeed = parsed.data.productNeed?.trim() || null;
    if (parsed.data.description !== undefined) data.description = parsed.data.description?.trim() || null;
    if (parsed.data.source !== undefined) data.source = parsed.data.source?.trim() || null;
    if (parsed.data.tenderUrl !== undefined) data.tenderUrl = parsed.data.tenderUrl?.trim() || null;
    if (parsed.data.status !== undefined) data.status = parsed.data.status;
    if (parsed.data.notes !== undefined) data.notes = parsed.data.notes?.trim() || null;
    if (parsed.data.bidDeadline !== undefined) {
      const bidDeadline = parseOptionalDate(parsed.data.bidDeadline);
      if (parsed.data.bidDeadline && bidDeadline === undefined) {
        return NextResponse.json({ error: "投标截止日期无效" }, { status: 400 });
      }
      data.bidDeadline = bidDeadline ?? null;
    }
    if (parsed.data.ownerId !== undefined) {
      data.ownerId = await resolveExportOwnerId(ctx!.tenantId, parsed.data.ownerId);
    }

    const updated = await prisma.exportProject.update({
      where: { id, tenantId: ctx!.tenantId },
      data,
      include: PROJECT_DETAIL_INCLUDE,
    });
    return NextResponse.json({ data: updated });
  } catch (e) {
    console.error("Update export project error:", e);
    return NextResponse.json(
      { error: prismaErrorToUserMessage(e, "更新项目失败") },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { user, ctx, error } = await requireExportSession();
  if (error) return error;
  const { id } = await params;
  const { project, error: err } = await getProjectOrError(id, ctx!.tenantId);
  if (err) return err;

  try {
    await deleteWithExportLog({
      tenantId: ctx!.tenantId,
      entityType: "project",
      recordId: id,
      summary: project!.name,
      snapshot: project,
      deletedById: user!.id,
      deleteFn: (tx) => tx.exportProject.delete({ where: { id, tenantId: ctx!.tenantId } }),
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Delete export project error:", e);
    return NextResponse.json(
      { error: prismaErrorToUserMessage(e, "删除项目失败") },
      { status: 500 },
    );
  }
}
