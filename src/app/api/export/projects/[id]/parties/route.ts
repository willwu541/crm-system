import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireExportSession } from "@/lib/export/auth";
import { prismaErrorToUserMessage } from "@/lib/prisma-user-message";
import { canonicalizeCountry } from "@/lib/export/countries";
import { PROJECT_PARTY_ROLES } from "@/lib/export-constants";
import { PARTY_INCLUDE, getProjectOrError } from "@/lib/export/projects";
import { boardFieldsFromNewParty } from "@/lib/export/project-board";
import { blankToNull } from "@/lib/export/blank-to-null";
import { normalizeWebsiteUrl } from "@/lib/website";
import { z } from "zod";

const createSchema = z.object({
  role: z.enum(PROJECT_PARTY_ROLES),
  companyName: z.string().trim().min(1, "请填写公司名"),
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

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { user, ctx, error } = await requireExportSession();
  if (error) return error;
  const { id } = await params;
  const { project, error: err } = await getProjectOrError(id, ctx!.tenantId, user!);
  if (err) return err;
  return NextResponse.json({ data: project!.parties });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { user, ctx, error } = await requireExportSession();
  if (error) return error;
  const { id } = await params;
  const { project, error: err } = await getProjectOrError(id, ctx!.tenantId, user!);
  if (err) return err;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求体无效或为空，请刷新页面后重试" }, { status: 400 });
  }

  try {
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "参数错误" },
        { status: 400 },
      );
    }

    const party = await prisma.exportProjectParty.create({
      data: {
        tenantId: ctx!.tenantId,
        projectId: id,
        role: parsed.data.role,
        companyName: parsed.data.companyName,
        country: canonicalizeCountry(parsed.data.country ?? "") || parsed.data.country?.trim() || null,
        website: normalizeWebsiteUrl(parsed.data.website) || null,
        contactName: blankToNull(parsed.data.contactName) ?? null,
        contactTitle: blankToNull(parsed.data.contactTitle) ?? null,
        email: blankToNull(parsed.data.email) ?? null,
        phone: blankToNull(parsed.data.phone) ?? null,
        whatsapp: blankToNull(parsed.data.whatsapp) ?? null,
        linkedin: blankToNull(parsed.data.linkedin) ?? null,
        notes: blankToNull(parsed.data.notes) ?? null,
        foundById: user!.id,
      },
      include: PARTY_INCLUDE,
    });
    const boardPatch = boardFieldsFromNewParty(project!, parsed.data.role, parsed.data.companyName);
    if (Object.keys(boardPatch).length > 0) {
      await prisma.exportProject.update({
        where: { id, tenantId: ctx!.tenantId },
        data: boardPatch,
      });
    }
    return NextResponse.json({ data: party });
  } catch (e) {
    console.error("Create export project party error:", e);
    return NextResponse.json(
      { error: prismaErrorToUserMessage(e, "添加参与方失败") },
      { status: 500 },
    );
  }
}
