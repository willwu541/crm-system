import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireExportSession } from "@/lib/export/auth";
import { findAssignableExportUser } from "@/lib/export/assignees";
import { canAssignExportWork, presentExportLead } from "@/lib/export/lead-pool";
import { ExportLeadTakeError, assertLeadTaken, assignExportLead } from "@/lib/export/take-lead";
import { z } from "zod";

const bodySchema = z.object({
  userId: z.string().min(1),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { user, ctx, error } = await requireExportSession();
  if (error) return error;
  if (!canAssignExportWork(user!)) {
    return NextResponse.json({ error: "只有管理者可以分配线索" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求体无效" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "请选择要分配的人" }, { status: 400 });
  }

  const { id } = await params;
  const assignee = await findAssignableExportUser(ctx!.tenantId, parsed.data.userId);
  if (!assignee) {
    return NextResponse.json({ error: "只能分配给业务员或业务经理" }, { status: 400 });
  }

  try {
    const lead = await prisma.$transaction(async (tx) => {
      const assigned = await assignExportLead(tx, {
        tenantId: ctx!.tenantId,
        leadId: id,
        assigneeId: assignee.id,
        assignedById: user!.id,
      });
      assertLeadTaken(assigned);
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
    console.error("Assign lead error:", e);
    return NextResponse.json({ error: "分配失败，请稍后重试" }, { status: 500 });
  }
}
