import { prisma } from "@/lib/prisma";

const PREFIXES = {
  customer: "CUS",
  quote: "QUO",
  order: "ORD",
} as const;

type Prefix = (typeof PREFIXES)[keyof typeof PREFIXES];

/**
 * 生成格式: PREFIX-YYYY-0001
 * 按 tenant + 年份递增，保证唯一
 */
async function generateNext(
  tenantId: string,
  prefix: Prefix
): Promise<string> {
  const year = new Date().getFullYear();

  const seq = await prisma.$transaction(async (tx) => {
    const existing = await tx.exportSequence.findUnique({
      where: {
        tenantId_prefix_year: { tenantId, prefix, year },
      },
    });

    const nextSeq = (existing?.lastSeq ?? 0) + 1;

    await tx.exportSequence.upsert({
      where: {
        tenantId_prefix_year: { tenantId, prefix, year },
      },
      create: {
        tenantId,
        prefix,
        year,
        lastSeq: nextSeq,
      },
      update: { lastSeq: nextSeq },
    });

    return nextSeq;
  });

  const padded = String(seq).padStart(4, "0");
  return `${prefix}-${year}-${padded}`;
}

export async function generateCustomerCode(tenantId: string): Promise<string> {
  return generateNext(tenantId, PREFIXES.customer);
}

export async function generateQuoteNo(tenantId: string): Promise<string> {
  return generateNext(tenantId, PREFIXES.quote);
}

export async function generateOrderNo(tenantId: string): Promise<string> {
  return generateNext(tenantId, PREFIXES.order);
}
