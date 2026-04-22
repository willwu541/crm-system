import { prisma } from "@/lib/prisma";
import { getWebsiteHost } from "@/lib/website";

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

interface DuplicateMatch {
  entityType: DuplicateEntityType;
  id: string;
  companyName: string;
  field: DuplicateField;
}

function normalizeCompanyName(value?: string | null): string | null {
  const raw = value?.trim().toLowerCase();
  if (!raw) return null;
  return raw.replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "");
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

function buildDuplicateMessage(match: DuplicateMatch): string {
  const entityLabel = match.entityType === "customer" ? "客户" : "线索";
  const fieldLabelMap: Record<DuplicateField, string> = {
    companyName: "公司名称",
    website: "网站",
    email: "邮箱",
    phone: "电话",
  };
  return `发现重复：与${entityLabel}「${match.companyName}」的${fieldLabelMap[match.field]}重复，请先检查现有记录。`;
}

export async function getExportDuplicateMessage(input: DuplicateCheckInput): Promise<string | null> {
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

    if (normalized.website && website === normalized.website) {
      return buildDuplicateMessage({ entityType: "customer", id: customer.id, companyName: customer.companyName, field: "website" });
    }
    if (normalized.email && emails.includes(normalized.email)) {
      return buildDuplicateMessage({ entityType: "customer", id: customer.id, companyName: customer.companyName, field: "email" });
    }
    if (normalized.phone && phones.includes(normalized.phone)) {
      return buildDuplicateMessage({ entityType: "customer", id: customer.id, companyName: customer.companyName, field: "phone" });
    }
    if (normalized.companyName && companyName === normalized.companyName) {
      return buildDuplicateMessage({ entityType: "customer", id: customer.id, companyName: customer.companyName, field: "companyName" });
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

    if (normalized.website && website === normalized.website) {
      return buildDuplicateMessage({ entityType: "lead", id: lead.id, companyName: lead.companyName, field: "website" });
    }
    if (normalized.email && emails.includes(normalized.email)) {
      return buildDuplicateMessage({ entityType: "lead", id: lead.id, companyName: lead.companyName, field: "email" });
    }
    if (normalized.phone && phones.includes(normalized.phone)) {
      return buildDuplicateMessage({ entityType: "lead", id: lead.id, companyName: lead.companyName, field: "phone" });
    }
    if (normalized.companyName && companyName === normalized.companyName) {
      return buildDuplicateMessage({ entityType: "lead", id: lead.id, companyName: lead.companyName, field: "companyName" });
    }
  }

  return null;
}
