import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PROJECT_PARTY_ROLES, PROJECT_STATUSES } from "@/lib/export-constants";
import type { Prisma } from "@prisma/client";

export const PROJECT_LIST_INCLUDE = {
  owner: { select: { id: true, name: true } },
  createdBy: { select: { id: true, name: true } },
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
