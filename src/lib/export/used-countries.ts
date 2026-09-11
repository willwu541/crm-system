import { prisma } from "@/lib/prisma";
import { extraCountryValues } from "@/lib/export/countries";

export async function loadUsedExportCountries(tenantId: string, ownerId?: string) {
  const scope = { tenantId, ...(ownerId ? { ownerId } : {}) };
  const [leadRows, customerRows] = await Promise.all([
    prisma.exportLead.groupBy({
      by: ["country"],
      where: {
        ...scope,
        AND: [{ country: { not: null } }, { country: { not: "" } }],
      },
    }),
    prisma.exportCustomer.groupBy({
      by: ["country"],
      where: {
        ...scope,
        AND: [{ country: { not: null } }, { country: { not: "" } }],
      },
    }),
  ]);
  return extraCountryValues([
    ...leadRows.map((row) => row.country),
    ...customerRows.map((row) => row.country),
  ]);
}
