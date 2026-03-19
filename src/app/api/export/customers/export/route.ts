import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireExportSession } from "@/lib/export/auth";
import { toDisplayString } from "@/lib/export/interested-products";

function escapeCSV(val: string | null | undefined): string {
  if (val == null) return "";
  const s = String(val);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export async function GET(request: NextRequest) {
  const { ctx, error } = await requireExportSession();
  if (error) return error;

  const where: Record<string, unknown> = { tenantId: ctx!.tenantId };
  if (ctx!.ownerFilter) where.ownerId = ctx!.ownerFilter.ownerId;

  const customers = await prisma.exportCustomer.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { owner: { select: { name: true } } },
  });

  const headers = [
    "customerCode",
    "companyName",
    "website",
    "country",
    "city",
    "address",
    "customerType",
    "industry",
    "marketPriority",
    "valueLevel",
    "interestedProducts",
    "sourceChannel",
    "status",
    "owner",
    "lastFollowUpAt",
    "nextFollowUpAt",
    "lastStageChangedAt",
    "lostReason",
    "notes",
    "createdAt",
  ];

  const rows = customers.map((c) =>
    headers
      .map((h) => {
        if (h === "owner") return escapeCSV(c.owner?.name);
        if (h === "interestedProducts") return escapeCSV(toDisplayString(c.interestedProducts));
        if (h === "lastFollowUpAt") return escapeCSV(c.lastFollowUpAt?.toISOString());
        if (h === "nextFollowUpAt") return escapeCSV(c.nextFollowUpAt?.toISOString());
        if (h === "lastStageChangedAt") return escapeCSV(c.lastStageChangedAt?.toISOString());
        if (h === "createdAt") return escapeCSV(c.createdAt?.toISOString());
        return escapeCSV((c as Record<string, unknown>)[h] as string);
      })
      .join(",")
  );

  const csv = [headers.join(","), ...rows].join("\n");
  return new NextResponse("\uFEFF" + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="customers_${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
