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

  const orders = await prisma.exportOrder.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      customer: { select: { companyName: true, customerCode: true } },
      quote: { select: { quoteNo: true } },
    },
  });

  const headers = [
    "orderNo",
    "companyName",
    "customerCode",
    "quoteNo",
    "orderDate",
    "currency",
    "totalAmount",
    "paymentTerm",
    "paymentStatus",
    "productionStatus",
    "shippingStatus",
    "eta",
    "actualShipDate",
    "notes",
    "createdAt",
  ];

  const rows = orders.map((o) =>
    headers
      .map((h) => {
        if (h === "companyName") return escapeCSV(o.customer?.companyName);
        if (h === "customerCode") return escapeCSV(o.customer?.customerCode);
        if (h === "quoteNo") return escapeCSV(o.quote?.quoteNo);
        if (h === "orderDate") return escapeCSV(o.orderDate?.toISOString());
        if (h === "eta") return escapeCSV(o.eta?.toISOString());
        if (h === "actualShipDate") return escapeCSV(o.actualShipDate?.toISOString());
        if (h === "createdAt") return escapeCSV(o.createdAt?.toISOString());
        return escapeCSV((o as Record<string, unknown>)[h] as string);
      })
      .join(",")
  );

  const csv = [headers.join(","), ...rows].join("\n");
  return new NextResponse("\uFEFF" + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="orders_${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
