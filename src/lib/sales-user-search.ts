import { prisma } from "@/lib/prisma";

export async function findSalesUsersByName(opts: {
  tenant: "export" | "domestic";
  tenantId?: string | null;
  keyword: string;
}): Promise<{ exactIds: string[]; partialIds: string[] }> {
  const keyword = opts.keyword.trim();
  if (!keyword) return { exactIds: [], partialIds: [] };

  const users = await prisma.user.findMany({
    where: {
      isActive: true,
      tenant: opts.tenant,
      ...(opts.tenant === "export" && opts.tenantId ? { tenantId: opts.tenantId } : {}),
      name: { contains: keyword, mode: "insensitive" },
    },
    select: { id: true, name: true },
  });

  const needle = keyword.toLowerCase();
  const exactIds = users.filter((u) => u.name.trim().toLowerCase() === needle).map((u) => u.id);
  return { exactIds, partialIds: users.map((u) => u.id) };
}
