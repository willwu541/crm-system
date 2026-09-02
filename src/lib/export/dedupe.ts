import { prisma } from "@/lib/prisma";
import { getWebsiteHost } from "@/lib/website";
import { normalizeCompanyName } from "@/lib/search-text";

type DuplicateEntityType = "customer" | "lead";
type DuplicateField = "companyName" | "website" | "email" | "phone";

interface DuplicateCheckInput {
  tenantId: string;
  companyName?: string | null;
  website?: string | null;
  email?: string | null;
  phone?: string | null;
  exclude?: {
    customerId?: string;
    leadId?: string;
    linkedCustomerId?: string | null;
  };
}

export interface DuplicateMatchInfo {
  entityType: DuplicateEntityType;
  id: string;
  companyName: string;
  field: DuplicateField;
  ownerName: string;
  href: string;
}

function normalizeEmail(value?: string | null): string | null {
  const raw = value?.trim().toLowerCase();
  return raw || null;
}

function normalizePhone(value?: string | null): string | null {
  const raw = value?.trim();
  if (!raw) return null;
  const digits = raw.replace(/[^\d+]+/g, "");
  return digits || null;
}

export function formatExportDuplicateMessage(match: DuplicateMatchInfo): string {
  const entityLabel = match.entityType === "customer" ? "客户" : "线索";
  const fieldLabelMap: Record<DuplicateField, string> = {
    companyName: "公司名称",
    website: "网站",
    email: "邮箱",
    phone: "电话",
  };
  const ownerPart = match.ownerName ? `，负责人：${match.ownerName}` : "";
  return `发现重复：与${entityLabel}「${match.companyName}」的${fieldLabelMap[match.field]}重复${ownerPart}。请打开已有记录，不要重复录入。`;
}

function toMatch(
  entityType: DuplicateEntityType,
  id: string,
  companyName: string,
  field: DuplicateField,
  ownerName: string,
): DuplicateMatchInfo {
  return {
    entityType,
    id,
    companyName,
    field,
    ownerName,
    href: entityType === "customer" ? `/export/customers/${id}` : `/export/leads/${id}`,
  };
}

export async function findExportDuplicate(input: DuplicateCheckInput): Promise<DuplicateMatchInfo | null> {
  const normalized = {
    companyName: normalizeCompanyName(input.companyName),
    website: getWebsiteHost(input.website),
    email: normalizeEmail(input.email),
    phone: normalizePhone(input.phone),
  };

  if (!normalized.companyName && !normalized.website && !normalized.email && !normalized.phone) {
    return null;
  }

  const [customers, leads] = await Promise.all([
    prisma.exportCustomer.findMany({
      where: {
        tenantId: input.tenantId,
        ...(input.exclude?.customerId ? { NOT: { id: input.exclude.customerId } } : {}),
      },
      select: {
        id: true,
        companyName: true,
        website: true,
        owner: { select: { name: true } },
        contacts: { select: { email: true, phone: true, whatsapp: true } },
      },
    }),
    prisma.exportLead.findMany({
      where: {
        tenantId: input.tenantId,
        ...(input.exclude?.leadId ? { NOT: { id: input.exclude.leadId } } : {}),
      },
      select: {
        id: true,
        companyName: true,
        website: true,
        email: true,
        phone: true,
        whatsapp: true,
        convertedToCustomerId: true,
        owner: { select: { name: true } },
      },
    }),
  ]);

  for (const customer of customers) {
    if (input.exclude?.linkedCustomerId && customer.id === input.exclude.linkedCustomerId) {
      continue;
    }

    const companyName = normalizeCompanyName(customer.companyName);
    const website = getWebsiteHost(customer.website);
    const emails = customer.contacts.map((contact) => normalizeEmail(contact.email)).filter(Boolean);
    const phones = customer.contacts
      .flatMap((contact) => [normalizePhone(contact.phone), normalizePhone(contact.whatsapp)])
      .filter(Boolean);
    const ownerName = customer.owner.name;

    if (normalized.website && website === normalized.website) {
      return toMatch("customer", customer.id, customer.companyName, "website", ownerName);
    }
    if (normalized.email && emails.includes(normalized.email)) {
      return toMatch("customer", customer.id, customer.companyName, "email", ownerName);
    }
    if (normalized.phone && phones.includes(normalized.phone)) {
      return toMatch("customer", customer.id, customer.companyName, "phone", ownerName);
    }
    if (normalized.companyName && companyName === normalized.companyName) {
      return toMatch("customer", customer.id, customer.companyName, "companyName", ownerName);
    }
  }

  for (const lead of leads) {
    if (input.exclude?.customerId && lead.convertedToCustomerId === input.exclude.customerId) {
      continue;
    }

    const companyName = normalizeCompanyName(lead.companyName);
    const website = getWebsiteHost(lead.website);
    const emails = [normalizeEmail(lead.email)].filter(Boolean);
    const phones = [normalizePhone(lead.phone), normalizePhone(lead.whatsapp)].filter(Boolean);
    const ownerName = lead.owner.name;

    if (normalized.website && website === normalized.website) {
      return toMatch("lead", lead.id, lead.companyName, "website", ownerName);
    }
    if (normalized.email && emails.includes(normalized.email)) {
      return toMatch("lead", lead.id, lead.companyName, "email", ownerName);
    }
    if (normalized.phone && phones.includes(normalized.phone)) {
      return toMatch("lead", lead.id, lead.companyName, "phone", ownerName);
    }
    if (normalized.companyName && companyName === normalized.companyName) {
      return toMatch("lead", lead.id, lead.companyName, "companyName", ownerName);
    }
  }

  return null;
}

export async function getExportDuplicateMessage(input: DuplicateCheckInput): Promise<string | null> {
  const match = await findExportDuplicate(input);
  return match ? formatExportDuplicateMessage(match) : null;
}

export function exportDuplicateConflictBody(match: DuplicateMatchInfo) {
  return {
    error: formatExportDuplicateMessage(match),
    duplicate: match,
  };
}
