import { prisma } from "@/lib/prisma";
import { companyNameTokenAndWhere, normalizeCompanyName } from "@/lib/search-text";

/**
 * 按去标点后的公司名模糊匹配。查重用同一套规范化，列表搜索也必须能找到。
 * 表名只能是白名单字面量，不能拼接用户输入。
 */
export async function withNormalizedCompanyIds<T extends { keyword?: string }>(
  table: "export_customers" | "export_leads",
  tenantId: string,
  filters: T,
): Promise<T & { normalizedCompanyIds?: string[] }> {
  if (!filters.keyword) return filters;
  const ids = await findExportIdsByNormalizedCompanyName(table, tenantId, filters.keyword);
  return ids.length ? { ...filters, normalizedCompanyIds: ids } : filters;
}

export async function findExportIdsByNormalizedCompanyName(
  table: "export_customers" | "export_leads",
  tenantId: string,
  keyword: string,
): Promise<string[]> {
  const compact = normalizeCompanyName(keyword);
  if (!compact) return [];
  const pattern = `%${compact}%`;

  const rows =
    table === "export_customers"
      ? await prisma.$queryRaw<{ id: string }[]>`
          SELECT id FROM export_customers
          WHERE tenant_id = ${tenantId}
            AND regexp_replace(lower(company_name), '[^a-z0-9一-龥]+', '', 'g') LIKE ${pattern}
          LIMIT 80
        `
      : await prisma.$queryRaw<{ id: string }[]>`
          SELECT id FROM export_leads
          WHERE tenant_id = ${tenantId}
            AND regexp_replace(lower(company_name), '[^a-z0-9一-龥]+', '', 'g') LIKE ${pattern}
          LIMIT 80
        `;

  return rows.map((r) => r.id);
}

export async function findDomesticCustomerIdsByNormalizedName(keyword: string): Promise<string[]> {
  const compact = normalizeCompanyName(keyword);
  if (!compact) return [];
  const pattern = `%${compact}%`;
  const rows = await prisma.$queryRaw<{ id: string }[]>`
    SELECT id FROM customers
    WHERE regexp_replace(lower(name), '[^a-z0-9一-龥]+', '', 'g') LIKE ${pattern}
    LIMIT 80
  `;
  return rows.map((r) => r.id);
}

export interface ExportNameHit {
  entityType: "customer" | "lead";
  id: string;
  companyName: string;
  ownerName: string;
  href: string;
}

/** 不限业务员、客户/线索一起找，用于列表搜空时提示「其实在系统里」。 */
export async function findExportRecordsByKeyword(
  tenantId: string,
  keyword: string,
): Promise<ExportNameHit[]> {
  const [customerIds, leadIds] = await Promise.all([
    findExportIdsByNormalizedCompanyName("export_customers", tenantId, keyword),
    findExportIdsByNormalizedCompanyName("export_leads", tenantId, keyword),
  ]);
  const tokenAnd = companyNameTokenAndWhere(keyword);
  const [customers, leads] = await Promise.all([
    prisma.exportCustomer.findMany({
      where: {
        tenantId,
        OR: [
          { companyName: { contains: keyword, mode: "insensitive" } },
          { customerCode: { contains: keyword, mode: "insensitive" } },
          ...(tokenAnd ? [tokenAnd] : []),
          ...(customerIds.length ? [{ id: { in: customerIds } }] : []),
        ],
      },
      select: { id: true, companyName: true, owner: { select: { name: true } } },
      take: 8,
      orderBy: { updatedAt: "desc" },
    }),
    prisma.exportLead.findMany({
      where: {
        tenantId,
        OR: [
          { companyName: { contains: keyword, mode: "insensitive" } },
          { email: { contains: keyword, mode: "insensitive" } },
          ...(tokenAnd ? [tokenAnd] : []),
          ...(leadIds.length ? [{ id: { in: leadIds } }] : []),
        ],
      },
      select: { id: true, companyName: true, owner: { select: { name: true } } },
      take: 8,
      orderBy: { updatedAt: "desc" },
    }),
  ]);
  return [
    ...customers.map((c) => ({
      entityType: "customer" as const,
      id: c.id,
      companyName: c.companyName,
      ownerName: c.owner.name,
      href: `/export/customers/${c.id}`,
    })),
    ...leads.map((l) => ({
      entityType: "lead" as const,
      id: l.id,
      companyName: l.companyName,
      ownerName: l.owner.name,
      href: `/export/leads/${l.id}`,
    })),
  ];
}
