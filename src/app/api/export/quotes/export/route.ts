import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireExportSession } from "@/lib/export/auth";
import { buildExportQuoteListWhere } from "@/lib/export/quote-list-where";
import { csvDownloadResponse } from "@/lib/export/csv";

function parseListParams(searchParams: URLSearchParams) {
  return {
    keyword: searchParams.get("keyword")?.trim(),
    status: searchParams.get("status")?.trim(),
    customerId: searchParams.get("customerId")?.trim(),
    ownerId: searchParams.get("ownerId")?.trim(),
    since: searchParams.get("since")?.trim(),
  };
}

export async function GET(request: NextRequest) {
  const { ctx, error } = await requireExportSession();
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const filters = parseListParams(searchParams);
  const where = buildExportQuoteListWhere(ctx!, filters);

  const quotes = await prisma.exportQuote.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 5000,
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

  const rows = quotes.map((q) => [
    q.quoteNo,
    q.customer?.companyName,
    q.customer?.customerCode,
    q.contact?.name,
    q.quoteDate?.toISOString(),
    q.currency,
    q.incoterm,
    q.validityDate?.toISOString(),
    q.productSummary,
    q.totalAmount != null ? String(q.totalAmount) : "",
    q.status,
    q.notes,
    q.createdAt?.toISOString(),
  ]);

  return csvDownloadResponse(`quotes_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
}
