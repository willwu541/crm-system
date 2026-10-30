import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireExportSession } from "@/lib/export/auth";
import {
  DAILY_LEAD_CLAIM_LIMIT,
  isExportAdmin,
  presentExportLead,
  startOfLocalDay,
} from "@/lib/export/lead-pool";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { user, ctx, error } = await requireExportSession();
  if (error) return error;
  const { id } = await params;

  try {
    const lead = await prisma.$transaction(async (tx) => {
      const current = await tx.exportLead.findUnique({
        where: { id, tenantId: ctx!.tenantId },
        select: { id: true, ownerId: true, convertedToCustomerId: true },
      });
      if (!current) return { error: "线索不存在", status: 404 as const };
      if (current.ownerId) return { error: "这条线索已经有人在跟", status: 409 as const };
      if (current.convertedToCustomerId) return { error: "该线索已转化", status: 400 as const };

      if (!isExportAdmin(user!)) {
        const used = await tx.exportLeadClaim.count({
          where: {
            tenantId: ctx!.tenantId,
            userId: user!.id,
            createdAt: { gte: startOfLocalDay() },
          },
        });
        if (used >= DAILY_LEAD_CLAIM_LIMIT) {
          return {
            error: `今天已认领 ${DAILY_LEAD_CLAIM_LIMIT} 条，明天再选。这样是为了避免一次把公海领空。`,
            status: 429 as const,
          };
        }
      }

      const taken = await tx.exportLead.updateMany({
        where: { id, tenantId: ctx!.tenantId, ownerId: null },
        data: { ownerId: user!.id, claimedAt: new Date() },
      });
      if (taken.count !== 1) return { error: "这条线索刚刚被别人领走了", status: 409 as const };

      await tx.exportLeadClaim.create({
        data: { tenantId: ctx!.tenantId, leadId: id, userId: user!.id },
      });

      return {
        lead: await tx.exportLead.findUnique({
          where: { id },
          include: { owner: { select: { id: true, name: true } } },
        }),
      };
    });

    if ("error" in lead && lead.error) {
      return NextResponse.json({ error: lead.error }, { status: lead.status });
    }
    return NextResponse.json({ data: lead.lead ? presentExportLead(lead.lead, user!) : null });
  } catch (e) {
    console.error("Claim lead error:", e);
    return NextResponse.json({ error: "认领失败，请稍后重试" }, { status: 500 });
  }
}
