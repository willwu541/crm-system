import { prisma } from "@/lib/prisma";
import { getAccessPolicy } from "@/lib/access-policy";

/** 业务员、经理，以及被设为业务经理的人。 */
export async function findAssignableExportUser(tenantId: string, userId: string) {
  const directorId = getAccessPolicy().directorUserId;
  return prisma.user.findFirst({
    where: {
      id: userId,
      tenant: "export",
      tenantId,
      isActive: true,
      OR: [
        { role: { in: ["SALES", "MANAGER"] } },
        ...(directorId ? [{ id: directorId }] : []),
      ],
    },
    select: { id: true },
  });
}
