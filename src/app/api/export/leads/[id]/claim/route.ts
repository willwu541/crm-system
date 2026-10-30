import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireExportSession } from "@/lib/export/auth";
import { presentExportLead } from "@/lib/export/lead-pool";
import { ExportLeadTakeError, assertLeadTaken, takeExportLeadFromPool } from "@/lib/export/take-lead";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { user, ctx, error } = await requireExportSession();
  if (error) return error;
  const { id } = await params;

  try {
    const lead = await prisma.$transaction(async (tx) => {
      const taken = await takeExportLeadFromPool(tx, {
        tenantId: ctx!.tenantId,
        leadId: id,
        user: user!,
      });
      assertLeadTaken(taken);
      return tx.exportLead.findUnique({
        where: { id },
        include: { owner: { select: { id: true, name: true } } },
      });
    });
    return NextResponse.json({ data: lead ? presentExportLead(lead, user!) : null });
  } catch (e) {
    if (e instanceof ExportLeadTakeError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    console.error("Claim lead error:", e);
    return NextResponse.json({ error: "认领失败，请稍后重试" }, { status: 500 });
  }
}
