import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireExportSession } from "@/lib/export/auth";

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
  if (ctx!.ownerFilter) {
    where.customer = { ownerId: ctx!.ownerFilter.ownerId };
  }

  const quotes = await prisma.exportQuote.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      customer: { select: { companyName: true, customerCode: true } },
      contact: { select: { name: true } },
    },
  });

  const headers = [
    "quoteNo",
    "companyName",
    "customerCode",
    "contactName",
    "quoteDate",
    "currency",
    "incoterm",
    "validityDate",
    "productSummary",
    "totalAmount",
    "status",
    "notes",
    "createdAt",
  ];

  const rows = quotes.map((q) =>
    headers
      .map((h) => {
        if (h === "companyName") return escapeCSV(q.customer?.companyName);
        if (h === "customerCode") return escapeCSV(q.customer?.customerCode);
        if (h === "contactName") return escapeCSV(q.contact?.name);
        if (h === "quoteDate") return escapeCSV(q.quoteDate?.toISOString());
        if (h === "validityDate") return escapeCSV(q.validityDate?.toISOString());
        if (h === "createdAt") return escapeCSV(q.createdAt?.toISOString());
        return escapeCSV((q as Record<string, unknown>)[h] as string);
      })
      .join(",")
  );

  const csv = [headers.join(","), ...rows].join("\n");
  return new NextResponse("\uFEFF" + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="quotes_${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
