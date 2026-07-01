import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireExportSession } from "@/lib/export/auth";
import { buildExportOrderListWhere } from "@/lib/export/order-list-where";
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
  const where = buildExportOrderListWhere(ctx!, filters);

  const orders = await prisma.exportOrder.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 5000,
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

  const rows = orders.map((o) => [
    o.orderNo,
    o.customer?.companyName,
    o.customer?.customerCode,
    o.quote?.quoteNo,
    o.orderDate?.toISOString(),
    o.currency,
    o.totalAmount != null ? String(o.totalAmount) : "",
    o.paymentTerm,
    o.paymentStatus,
    o.productionStatus,
    o.shippingStatus,
    o.eta?.toISOString(),
    o.actualShipDate?.toISOString(),
    o.notes,
    o.createdAt?.toISOString(),
  ]);

  return csvDownloadResponse(`orders_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
}
