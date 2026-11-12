import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireExportSession } from "@/lib/export/auth";
import { deleteWithExportLog } from "@/lib/export/deletion-log";
import { prismaErrorToUserMessage } from "@/lib/prisma-user-message";
import { canonicalizeCountry } from "@/lib/export/countries";
import {
  PROJECT_CONFIDENCE,
  PROJECT_DEMAND_STATUSES,
  PROJECT_ENTRY_STATUSES,
  PROJECT_INDUSTRIES,
  PROJECT_PROGRESS_MARKS,
  PROJECT_STAGES,
  PROJECT_STATUSES,
} from "@/lib/export-constants";
import { extractLeadManagerProjectNumber } from "@/lib/export/project-dispatch";
import { blankToNull } from "@/lib/export/blank-to-null";
import {
  PROJECT_DETAIL_INCLUDE,
  canManageExportProjects,
  denyUnlessCanManageProjects,
  findProjectBySourceNumber,
  getProjectOrError,
  parseOptionalDate,
  resolveExportOwnerId,
} from "@/lib/export/projects";
import { appendProjectUpdateNote, buildProjectUpdateNoteEntry } from "@/lib/export/project-update-note";
import { z } from "zod";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { user, ctx, error } = await requireExportSession();
  if (error) return error;
  const { id } = await params;
  const { project, error: err } = await getProjectOrError(id, ctx!.tenantId, user!);
  if (err) return err;
  return NextResponse.json({
    data: {
      ...project,
      canManage: canManageExportProjects(user!),
    },
  });
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
  entryStatus: z.enum(PROJECT_ENTRY_STATUSES).optional(),
  productNeed: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  source: z.string().optional().nullable(),
  tenderUrl: z.string().optional().nullable(),
  sourceProjectNumber: z.string().optional().nullable(),
  knownScope: z.string().optional().nullable(),
  gratingRelatedElements: z.string().optional().nullable(),
  needToVerify: z.string().optional().nullable(),
  askForRole: z.string().optional().nullable(),
  nextStep: z.string().optional().nullable(),
  feedbackDueAt: z.string().optional().nullable(),
  scheduleStatus: z.string().optional().nullable(),
  scheduleStart: z.string().optional().nullable(),
  scheduleEnd: z.string().optional().nullable(),
  tenderDeadline: z.string().optional().nullable(),
  tenderOpening: z.string().optional().nullable(),
  contractorState: z.string().optional().nullable(),
  appointmentMethod: z.string().optional().nullable(),
  projectValueText: z.string().optional().nullable(),
  projectValueOriginal: z.string().optional().nullable(),
  projectStatusRaw: z.string().optional().nullable(),
  region: z.string().optional().nullable(),
  siteArea: z.string().optional().nullable(),
  contractorListed: z.string().optional().nullable(),
  demandStatus: z.enum(PROJECT_DEMAND_STATUSES).optional(),
  progressMark: z.enum(PROJECT_PROGRESS_MARKS).optional(),
  actualBuyerCompany: z.string().optional().nullable(),
  actualBuyerContact: z.string().optional().nullable(),
  purchaseProgress: z.string().optional().nullable(),
  status: z.enum(PROJECT_STATUSES).optional(),
  bidDeadline: z.string().optional().nullable(),
  ownerId: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  /** 一次「更新」说明：追加进 notes，并可同请求改 stage */
  updateNote: z.string().trim().min(1, "请填写更新内容").optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { user, ctx, error } = await requireExportSession();
  if (error) return error;
  const { id } = await params;
  const { project: existing, error: err } = await getProjectOrError(id, ctx!.tenantId, user!);
  if (err) return err;
  const manageAll = canManageExportProjects(user!);

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

    if (!manageAll && parsed.data.ownerId !== undefined) {
      return NextResponse.json({ error: "只有管理者可以分配项目" }, { status: 403 });
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
    if (parsed.data.entryStatus !== undefined) data.entryStatus = parsed.data.entryStatus;
    if (parsed.data.productNeed !== undefined) data.productNeed = parsed.data.productNeed?.trim() || null;
    if (parsed.data.description !== undefined) data.description = parsed.data.description?.trim() || null;
    if (parsed.data.source !== undefined) data.source = parsed.data.source?.trim() || null;
    if (parsed.data.tenderUrl !== undefined) data.tenderUrl = parsed.data.tenderUrl?.trim() || null;
    if (parsed.data.sourceProjectNumber !== undefined || parsed.data.tenderUrl !== undefined) {
      const rawNumber = parsed.data.sourceProjectNumber ?? parsed.data.tenderUrl;
      const sourceProjectNumber = extractLeadManagerProjectNumber(rawNumber);
      if (parsed.data.sourceProjectNumber !== undefined || sourceProjectNumber) {
        if (sourceProjectNumber) {
          const existing = await findProjectBySourceNumber(ctx!.tenantId, sourceProjectNumber, id);
          if (existing) {
            return NextResponse.json(
              {
                error: `LM ${sourceProjectNumber} 已经录过`,
                existing: { id: existing.id, name: existing.name },
              },
              { status: 409 },
            );
          }
        }
        data.sourceProjectNumber = sourceProjectNumber;
      }
    }
    if (parsed.data.knownScope !== undefined) data.knownScope = blankToNull(parsed.data.knownScope) ?? null;
    if (parsed.data.gratingRelatedElements !== undefined) {
      data.gratingRelatedElements = blankToNull(parsed.data.gratingRelatedElements) ?? null;
    }
    if (parsed.data.needToVerify !== undefined) data.needToVerify = blankToNull(parsed.data.needToVerify) ?? null;
    if (parsed.data.askForRole !== undefined) data.askForRole = blankToNull(parsed.data.askForRole) ?? null;
    if (parsed.data.nextStep !== undefined) data.nextStep = blankToNull(parsed.data.nextStep) ?? null;
    if (parsed.data.scheduleStatus !== undefined) data.scheduleStatus = blankToNull(parsed.data.scheduleStatus) ?? null;
    if (parsed.data.scheduleStart !== undefined) data.scheduleStart = blankToNull(parsed.data.scheduleStart) ?? null;
    if (parsed.data.scheduleEnd !== undefined) data.scheduleEnd = blankToNull(parsed.data.scheduleEnd) ?? null;
    if (parsed.data.tenderDeadline !== undefined) data.tenderDeadline = blankToNull(parsed.data.tenderDeadline) ?? null;
    if (parsed.data.tenderOpening !== undefined) data.tenderOpening = blankToNull(parsed.data.tenderOpening) ?? null;
    if (parsed.data.contractorState !== undefined) data.contractorState = blankToNull(parsed.data.contractorState) ?? null;
    if (parsed.data.appointmentMethod !== undefined) data.appointmentMethod = blankToNull(parsed.data.appointmentMethod) ?? null;
    if (parsed.data.projectValueText !== undefined) data.projectValueText = blankToNull(parsed.data.projectValueText) ?? null;
    if (parsed.data.projectValueOriginal !== undefined) {
      data.projectValueOriginal = blankToNull(parsed.data.projectValueOriginal) ?? null;
    }
    if (parsed.data.projectStatusRaw !== undefined) data.projectStatusRaw = blankToNull(parsed.data.projectStatusRaw) ?? null;
    if (parsed.data.region !== undefined) data.region = blankToNull(parsed.data.region) ?? null;
    if (parsed.data.siteArea !== undefined) data.siteArea = blankToNull(parsed.data.siteArea) ?? null;
    if (parsed.data.contractorListed !== undefined) data.contractorListed = blankToNull(parsed.data.contractorListed) ?? null;
    if (parsed.data.demandStatus !== undefined) data.demandStatus = parsed.data.demandStatus;
    if (parsed.data.progressMark !== undefined) data.progressMark = parsed.data.progressMark;
    if (parsed.data.actualBuyerCompany !== undefined) {
      data.actualBuyerCompany = blankToNull(parsed.data.actualBuyerCompany) ?? null;
    }
    if (parsed.data.actualBuyerContact !== undefined) {
      data.actualBuyerContact = blankToNull(parsed.data.actualBuyerContact) ?? null;
    }
    if (parsed.data.purchaseProgress !== undefined) {
      data.purchaseProgress = blankToNull(parsed.data.purchaseProgress) ?? null;
    }
    if (parsed.data.status !== undefined) data.status = parsed.data.status;
    if (parsed.data.notes !== undefined) data.notes = parsed.data.notes?.trim() || null;
    if (parsed.data.updateNote !== undefined) {
      const nextStage = parsed.data.stage ?? existing!.stage;
      const entry = buildProjectUpdateNoteEntry({
        note: parsed.data.updateNote,
        stage: nextStage,
        previousStage: existing!.stage,
      });
      data.notes = appendProjectUpdateNote(
        typeof data.notes === "string" || data.notes === null ? (data.notes as string | null) : existing!.notes,
        entry,
      );
    }
    if (parsed.data.bidDeadline !== undefined) {
      const bidDeadline = parseOptionalDate(parsed.data.bidDeadline);
      if (parsed.data.bidDeadline && bidDeadline === undefined) {
        return NextResponse.json({ error: "投标截止日期无效" }, { status: 400 });
      }
      data.bidDeadline = bidDeadline ?? null;
    }
    if (parsed.data.feedbackDueAt !== undefined) {
      const feedbackDueAt = parseOptionalDate(parsed.data.feedbackDueAt);
      if (parsed.data.feedbackDueAt && feedbackDueAt === undefined) {
        return NextResponse.json({ error: "反馈日期无效" }, { status: 400 });
      }
      data.feedbackDueAt = feedbackDueAt ?? null;
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
  const denied = denyUnlessCanManageProjects(user!);
  if (denied) return denied;
  const { id } = await params;
  const { project, error: err } = await getProjectOrError(id, ctx!.tenantId, user!);
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
