import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireExportSession } from "@/lib/export/auth";
import { buildExportLeadListWhere } from "@/lib/export/lead-list-where";
import { csvDownloadResponse } from "@/lib/export/csv";

function parseListParams(searchParams: URLSearchParams) {
  return {
    keyword: searchParams.get("keyword")?.trim(),
    status: searchParams.get("status")?.trim(),
    country: searchParams.get("country")?.trim(),
    ownerId: searchParams.get("ownerId")?.trim(),
    since: searchParams.get("since")?.trim(),
    pace: searchParams.get("pace")?.trim(),
    sourceChannel: searchParams.get("sourceChannel")?.trim(),
  };
}

export async function GET(request: NextRequest) {
  const { ctx, error } = await requireExportSession();
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const filters = parseListParams(searchParams);
  const where = buildExportLeadListWhere(ctx!, filters);

  const leads = await prisma.exportLead.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    take: 5000,
    include: { owner: { select: { name: true } } },
  });

  const headers = [
    "companyName",
    "email",
    "phone",
    "whatsapp",
    "linkedin",
    "country",
    "sourceChannel",
    "status",
    "owner",
    "lastContactAt",
    "contactCount",
    "notes",
    "createdAt",
  ];

  const rows = leads.map((l) => [
    l.companyName,
    l.email,
    l.phone,
    l.whatsapp,
    l.linkedin,
    l.country,
    l.sourceChannel,
    l.status,
    l.owner?.name,
    l.lastContactAt?.toISOString(),
    String(l.contactCount),
    l.notes,
    l.createdAt?.toISOString(),
  ]);

  return csvDownloadResponse(`leads_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
}
