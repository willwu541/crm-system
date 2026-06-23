import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireExportSession } from "@/lib/export/auth";

export async function GET() {
  const { ctx, error } = await requireExportSession();
  if (error) return error;

  const leads = await prisma.exportLead.findMany({
    where: { tenantId: ctx!.tenantId, ...(ctx!.ownerFilter ?? {}) },
    select: { sourceChannel: true, status: true, convertedToCustomerId: true },
  });

  const map = new Map<
    string,
    { source: string; totalLeads: number; convertedLeads: number; validLeads: number }
  >();

  for (const l of leads) {
    const key = l.sourceChannel?.trim() || "未标注来源";
    const row = map.get(key) ?? {
      source: key,
      totalLeads: 0,
      convertedLeads: 0,
      validLeads: 0,
    };
    row.totalLeads += 1;
    if (l.status === "valid" || l.status === "converted") row.validLeads += 1;
    if (l.status === "converted" || l.convertedToCustomerId) row.convertedLeads += 1;
    map.set(key, row);
  }

  const data = Array.from(map.values())
    .map((r) => ({
      ...r,
      validRate: r.totalLeads ? Number(((r.validLeads / r.totalLeads) * 100).toFixed(1)) : 0,
      conversionRate: r.totalLeads
        ? Number(((r.convertedLeads / r.totalLeads) * 100).toFixed(1))
        : 0,
    }))
    .sort((a, b) => b.convertedLeads - a.convertedLeads || b.totalLeads - a.totalLeads)
    .slice(0, 20);

  return NextResponse.json({ data });
}

