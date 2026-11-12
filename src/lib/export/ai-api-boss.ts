import { getAccessPolicy } from "@/lib/access-policy";
import { prisma } from "@/lib/prisma";
import type { ExportAiBoss } from "@/lib/export/ai-api";

/** 密钥只代表管理者（ADMIN 且不是业务经理）。查询不包含密码哈希。 */
export async function loadExportAiBoss(): Promise<ExportAiBoss | null> {
  const directorId = getAccessPolicy().directorUserId;
  const admins = await prisma.user.findMany({
    where: { role: "ADMIN", isActive: true },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      tenant: true,
      tenantId: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  });
  const bosses = admins.filter((user) => user.id !== directorId);
  const preferred = bosses.filter((user) => user.tenant === "export");
  const boss = preferred[0] ?? bosses[0];
  if (!boss) return null;
  return {
    id: boss.id,
    name: boss.name,
    email: boss.email,
    role: "ADMIN",
    tenantId: boss.tenantId,
  };
}
