import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireExportSession } from "@/lib/export/auth";
import { buildExportCustomerListWhere } from "@/lib/export/customer-list-where";
import { csvDownloadResponse } from "@/lib/export/csv";

function parseListParams(searchParams: URLSearchParams) {
  return {
    keyword: searchParams.get("keyword")?.trim(),
    status: searchParams.get("status")?.trim(),
    country: searchParams.get("country")?.trim(),
    ownerId: searchParams.get("ownerId")?.trim(),
    filter: searchParams.get("filter")?.trim(),
  };
}

export async function GET(request: NextRequest) {
  const { ctx, error } = await requireExportSession();
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const filters = parseListParams(searchParams);
  const where = buildExportCustomerListWhere(ctx!, filters);

  const customers = await prisma.exportCustomer.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    take: 5000,
    include: {
      owner: { select: { name: true } },
      contacts: {
        where: { isPrimary: true },
        take: 1,
        select: { name: true, email: true, phone: true, whatsapp: true },
      },
    },
  });

  const headers = [
    "customerCode",
    "companyName",
    "website",
    "country",
    "city",
    "status",
    "owner",
    "primaryContact",
    "primaryEmail",
    "primaryPhone",
    "primaryWhatsapp",
    "lastFollowUpAt",
    "nextFollowUpAt",
    "notes",
    "createdAt",
  ];

  const rows = customers.map((c) => {
    const primary = c.contacts[0];
    return [
      c.customerCode,
      c.companyName,
      c.website,
      c.country,
      c.city,
      c.status,
      c.owner?.name,
      primary?.name,
      primary?.email,
      primary?.phone,
      primary?.whatsapp,
      c.lastFollowUpAt?.toISOString(),
      c.nextFollowUpAt?.toISOString(),
      c.notes,
      c.createdAt?.toISOString(),
    ];
  });

  return csvDownloadResponse(
    `customers_${new Date().toISOString().slice(0, 10)}.csv`,
    headers,
    rows
  );
}
