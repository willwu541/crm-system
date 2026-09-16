import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireExportSession } from "@/lib/export/auth";
import { deleteWithExportLog } from "@/lib/export/deletion-log";
import { prismaErrorToUserMessage } from "@/lib/prisma-user-message";
import { canonicalizeCountry } from "@/lib/export/countries";
import { PROJECT_PARTY_ROLES } from "@/lib/export-constants";
import { PARTY_INCLUDE, getProjectOrError } from "@/lib/export/projects";
import { blankToNull } from "@/lib/export/blank-to-null";
import { normalizeWebsiteUrl } from "@/lib/website";
import { z } from "zod";

async function getPartyOrError(projectId: string, partyId: string, tenantId: string) {
  const party = await prisma.exportProjectParty.findFirst({
    where: { id: partyId, projectId, tenantId },
    include: PARTY_INCLUDE,
  });
  if (!party) {
    return { party: null, error: NextResponse.json({ error: "参与方不存在" }, { status: 404 }) };
  }
  return { party, error: null };
}

const updateSchema = z.object({
  role: z.enum(PROJECT_PARTY_ROLES).optional(),
  companyName: z.string().trim().min(1, "请填写公司名").optional(),
  country: z.string().optional().nullable(),
  website: z.string().optional().nullable(),
  contactName: z.string().optional().nullable(),
  contactTitle: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  whatsapp: z.string().optional().nullable(),
  linkedin: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; partyId: string }> },
) {
  const { ctx, error } = await requireExportSession();
  if (error) return error;
  const { id, partyId } = await params;
  const { error: projectErr } = await getProjectOrError(id, ctx!.tenantId);
  if (projectErr) return projectErr;
  const { error: partyErr } = await getPartyOrError(id, partyId, ctx!.tenantId);
  if (partyErr) return partyErr;

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
    if (parsed.data.role !== undefined) data.role = parsed.data.role;
    if (parsed.data.companyName !== undefined) data.companyName = parsed.data.companyName;
    if (parsed.data.country !== undefined) {
      data.country =
        canonicalizeCountry(parsed.data.country ?? "") || parsed.data.country?.trim() || null;
    }
    if (parsed.data.website !== undefined) data.website = normalizeWebsiteUrl(parsed.data.website);
    if (parsed.data.contactName !== undefined) data.contactName = blankToNull(parsed.data.contactName) ?? null;
    if (parsed.data.contactTitle !== undefined) data.contactTitle = blankToNull(parsed.data.contactTitle) ?? null;
    if (parsed.data.email !== undefined) data.email = blankToNull(parsed.data.email) ?? null;
    if (parsed.data.phone !== undefined) data.phone = blankToNull(parsed.data.phone) ?? null;
    if (parsed.data.whatsapp !== undefined) data.whatsapp = blankToNull(parsed.data.whatsapp) ?? null;
    if (parsed.data.linkedin !== undefined) data.linkedin = blankToNull(parsed.data.linkedin) ?? null;
    if (parsed.data.notes !== undefined) data.notes = blankToNull(parsed.data.notes) ?? null;

    const updated = await prisma.exportProjectParty.update({
      where: { id: partyId },
      data,
      include: PARTY_INCLUDE,
    });
    return NextResponse.json({ data: updated });
  } catch (e) {
    console.error("Update export project party error:", e);
    return NextResponse.json(
      { error: prismaErrorToUserMessage(e, "更新参与方失败") },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; partyId: string }> },
) {
  const { user, ctx, error } = await requireExportSession();
  if (error) return error;
  const { id, partyId } = await params;
  const { error: projectErr } = await getProjectOrError(id, ctx!.tenantId);
  if (projectErr) return projectErr;
  const { party, error: partyErr } = await getPartyOrError(id, partyId, ctx!.tenantId);
  if (partyErr) return partyErr;

  try {
    await deleteWithExportLog({
      tenantId: ctx!.tenantId,
      entityType: "project_party",
      recordId: partyId,
      summary: `${party!.companyName}（${party!.role}）`,
      snapshot: party,
      deletedById: user!.id,
      deleteFn: (tx) => tx.exportProjectParty.delete({ where: { id: partyId } }),
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Delete export project party error:", e);
    return NextResponse.json(
      { error: prismaErrorToUserMessage(e, "删除参与方失败") },
      { status: 500 },
    );
  }
}
