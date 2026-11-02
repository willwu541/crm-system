import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireExportSession } from "@/lib/export/auth";
import { prismaErrorToUserMessage } from "@/lib/prisma-user-message";
import { exportDuplicateConflictBody, findExportDuplicate } from "@/lib/export/dedupe";
import { PARTY_INCLUDE, getProjectOrError, partyRoleToCustomerType } from "@/lib/export/projects";
import { projectPartyRoleLabel } from "@/lib/export-display-labels";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; partyId: string }> },
) {
  const { user, ctx, error } = await requireExportSession();
  if (error) return error;
  const { id, partyId } = await params;
  const { project, error: projectErr } = await getProjectOrError(id, ctx!.tenantId, user!);
  if (projectErr) return projectErr;

  const party = await prisma.exportProjectParty.findFirst({
    where: { id: partyId, projectId: id, tenantId: ctx!.tenantId },
    include: PARTY_INCLUDE,
  });
  if (!party) return NextResponse.json({ error: "参与方不存在" }, { status: 404 });
  if (party.leadId) {
    return NextResponse.json({
      data: party.lead,
      linkedExisting: true,
    });
  }

  try {
    const duplicate = await findExportDuplicate({
      tenantId: ctx!.tenantId,
      companyName: party.companyName,
      website: party.website,
      email: party.email,
      phone: party.phone ?? party.whatsapp,
    });
    if (duplicate) {
      if (duplicate.entityType === "lead") {
        const updated = await prisma.exportProjectParty.update({
          where: { id: partyId },
          data: { leadId: duplicate.id },
          include: PARTY_INCLUDE,
        });
        return NextResponse.json({
          data: updated.lead,
          linkedExisting: true,
          duplicate,
        });
      }
      return NextResponse.json(exportDuplicateConflictBody(duplicate, user!), { status: 400 });
    }

    const roleLabel = projectPartyRoleLabel[party.role] ?? party.role;
    const notes = [
      `来自项目「${project!.name}」，角色：${roleLabel}`,
      party.contactName ? `联系人：${party.contactName}${party.contactTitle ? `（${party.contactTitle}）` : ""}` : "",
      party.notes || "",
    ]
      .filter(Boolean)
      .join("\n");

    const lead = await prisma.exportLead.create({
      data: {
        tenantId: ctx!.tenantId,
        ownerId: null,
        claimedAt: null,
        companyName: party.companyName,
        website: party.website,
        country: party.country ?? project!.country,
        customerType: partyRoleToCustomerType(party.role),
        sourceChannel: "Tender / Bid Platform",
        sourceKeyword: project!.name,
        email: party.email,
        phone: party.phone,
        whatsapp: party.whatsapp,
        linkedin: party.linkedin,
        productInterest: project!.productNeed,
        notes,
        status: "new",
      },
      include: { owner: { select: { id: true, name: true } } },
    });

    await prisma.exportProjectParty.update({
      where: { id: partyId },
      data: { leadId: lead.id },
    });

    return NextResponse.json({ data: lead });
  } catch (e) {
    console.error("Convert project party to lead error:", e);
    return NextResponse.json(
      { error: prismaErrorToUserMessage(e, "转为线索失败") },
      { status: 500 },
    );
  }
}
