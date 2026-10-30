import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireExportSession } from "@/lib/export/auth";
import { isExportAdmin, presentExportLead } from "@/lib/export/lead-pool";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { user, ctx, error } = await requireExportSession();
  if (error) return error;
  if (!isExportAdmin(user!)) {
    return NextResponse.json({ error: "只有管理员可以把线索放回公海" }, { status: 403 });
  }
  const { id } = await params;
  const lead = await prisma.exportLead.findUnique({
    where: { id, tenantId: ctx!.tenantId },
    select: { id: true, convertedToCustomerId: true },
  });
  if (!lead) return NextResponse.json({ error: "线索不存在" }, { status: 404 });
  if (lead.convertedToCustomerId) {
    return NextResponse.json({ error: "已转化的线索不能放回公海" }, { status: 400 });
  }

  const updated = await prisma.exportLead.update({
    where: { id, tenantId: ctx!.tenantId },
    data: { ownerId: null, claimedAt: null },
    include: { owner: { select: { id: true, name: true } } },
  });
  return NextResponse.json({ data: presentExportLead(updated, user!) });
}
