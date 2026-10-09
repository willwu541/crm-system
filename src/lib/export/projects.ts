import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  PROJECT_CONFIDENCE,
  PROJECT_ENTRY_STATUSES,
  PROJECT_INDUSTRIES,
  PROJECT_PARTY_ROLES,
  PROJECT_STAGES,
  PROJECT_STATUSES,
} from "@/lib/export-constants";
import type { Prisma } from "@prisma/client";

export const PROJECT_LIST_INCLUDE = {
  owner: { select: { id: true, name: true } },
  createdBy: { select: { id: true, name: true } },
  parties: { select: { role: true, companyName: true } },
  _count: { select: { parties: true } },
} satisfies Prisma.ExportProjectInclude;

export const PROJECT_DETAIL_INCLUDE = {
  owner: { select: { id: true, name: true } },
  createdBy: { select: { id: true, name: true } },
  parties: {
    orderBy: { createdAt: "desc" as const },
    include: {
      foundBy: { select: { id: true, name: true } },
      lead: { select: { id: true, companyName: true } },
    },
  },
} satisfies Prisma.ExportProjectInclude;

export const PARTY_INCLUDE = {
  foundBy: { select: { id: true, name: true } },
  lead: { select: { id: true, companyName: true } },
} satisfies Prisma.ExportProjectPartyInclude;

export function isProjectStatus(value: string): value is (typeof PROJECT_STATUSES)[number] {
  return (PROJECT_STATUSES as readonly string[]).includes(value);
}

export function isProjectEntryStatus(value: string): value is (typeof PROJECT_ENTRY_STATUSES)[number] {
  return (PROJECT_ENTRY_STATUSES as readonly string[]).includes(value);
}

export function isProjectStage(value: string): value is (typeof PROJECT_STAGES)[number] {
  return (PROJECT_STAGES as readonly string[]).includes(value);
}

export function isProjectIndustry(value: string): value is (typeof PROJECT_INDUSTRIES)[number] {
  return (PROJECT_INDUSTRIES as readonly string[]).includes(value);
}

export function isProjectConfidence(value: string): value is (typeof PROJECT_CONFIDENCE)[number] {
  return (PROJECT_CONFIDENCE as readonly string[]).includes(value);
}

export function isProjectPartyRole(value: string): value is (typeof PROJECT_PARTY_ROLES)[number] {
  return (PROJECT_PARTY_ROLES as readonly string[]).includes(value);
}

export function partyRoleToCustomerType(role: string): string | undefined {
  switch (role) {
    case "epc":
      return "EPC contractor";
    case "general_contractor":
      return "General contractor";
    case "subcontractor":
      return "Installer";
    case "fabricator":
      return "Steel fabricator";
    case "owner":
      return "End user";
    default:
      return undefined;
  }
}

export function extractSearchDigits(keyword: string): string {
  return keyword.replace(/\D/g, "");
}

export function projectKeywordOrClauses(
  keyword: string,
  extraIds?: string[],
): Record<string, unknown>[] {
  const or: Record<string, unknown>[] = [
    { name: { contains: keyword, mode: "insensitive" } },
    { city: { contains: keyword, mode: "insensitive" } },
    { location: { contains: keyword, mode: "insensitive" } },
    { productNeed: { contains: keyword, mode: "insensitive" } },
    { description: { contains: keyword, mode: "insensitive" } },
    { source: { contains: keyword, mode: "insensitive" } },
    { notes: { contains: keyword, mode: "insensitive" } },
    { ownerOperator: { contains: keyword, mode: "insensitive" } },
    { generalContractor: { contains: keyword, mode: "insensitive" } },
    { potentialBuyers: { contains: keyword, mode: "insensitive" } },
    { parties: { some: { companyName: { contains: keyword, mode: "insensitive" } } } },
    { parties: { some: { contactName: { contains: keyword, mode: "insensitive" } } } },
    { parties: { some: { whatsapp: { contains: keyword, mode: "insensitive" } } } },
    { parties: { some: { phone: { contains: keyword, mode: "insensitive" } } } },
    { parties: { some: { email: { contains: keyword, mode: "insensitive" } } } },
    { owner: { name: { contains: keyword, mode: "insensitive" } } },
    { createdBy: { name: { contains: keyword, mode: "insensitive" } } },
  ];
  const digits = extractSearchDigits(keyword);
  if (digits.length >= 6) {
    or.push({ parties: { some: { whatsapp: { contains: digits } } } });
    or.push({ parties: { some: { phone: { contains: digits } } } });
  }
  if (extraIds?.length) or.push({ id: { in: extraIds } });
  return or;
}

export async function findProjectIdsByPartyPhoneDigits(
  tenantId: string,
  keyword: string,
): Promise<string[]> {
  const digits = extractSearchDigits(keyword);
  if (digits.length < 6) return [];
  const pattern = `%${digits}%`;
  const rows = await prisma.$queryRaw<{ id: string }[]>`
    SELECT DISTINCT p.id
    FROM export_projects p
    INNER JOIN export_project_parties x ON x.project_id = p.id
    WHERE p.tenant_id = ${tenantId}
      AND (
        regexp_replace(COALESCE(x.whatsapp, ''), '[^0-9]', '', 'g') LIKE ${pattern}
        OR regexp_replace(COALESCE(x.phone, ''), '[^0-9]', '', 'g') LIKE ${pattern}
      )
    LIMIT 80
  `;
  return rows.map((r) => r.id);
}

export function parseOptionalDate(value: string | null | undefined): Date | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value.trim() === "") return null;
  const raw = value.trim();
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  if (dateOnly) {
    const d = new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]));
    return Number.isNaN(d.getTime()) ? undefined : d;
  }
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

export async function getProjectOrError(id: string, tenantId: string) {
  const project = await prisma.exportProject.findUnique({
    where: { id, tenantId },
    include: PROJECT_DETAIL_INCLUDE,
  });
  if (!project) {
    return { project: null, error: NextResponse.json({ error: "项目不存在" }, { status: 404 }) };
  }
  return { project, error: null };
}

export async function resolveExportOwnerId(
  tenantId: string,
  ownerId: string | null | undefined,
): Promise<string | null | undefined> {
  if (ownerId === undefined) return undefined;
  if (!ownerId) return null;
  const assignee = await prisma.user.findFirst({
    where: { id: ownerId, tenant: "export", tenantId, isActive: true },
    select: { id: true },
  });
  return assignee?.id ?? null;
}
