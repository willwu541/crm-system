import type { UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAccessPolicy } from "@/lib/access-policy";

const ASSIGNABLE_ROLES: UserRole[] = ["SALES", "MANAGER"];
const OWNER_FILTER_ROLES: UserRole[] = ["SALES", "MANAGER", "ADMIN"];

/** 可以被分配项目的人：业务员、经理，以及被设为业务经理的人。 */
export function assignableExportUserWhere(directorId: string | null) {
  return {
    OR: [
      { role: { in: ASSIGNABLE_ROLES } },
      ...(directorId ? [{ id: directorId }] : []),
    ],
  };
}

/**
 * 项目列表按负责人筛。认领会把项目记到管理者（ADMIN）名下，
 * 所以除了可分配的人，还要带上管理者本人。
 */
export function projectOwnerFilterUserWhere(directorId: string | null) {
  return {
    OR: [
      { role: { in: OWNER_FILTER_ROLES } },
      ...(directorId ? [{ id: directorId }] : []),
    ],
  };
}

/** 业务员、经理，以及被设为业务经理的人。 */
export async function findAssignableExportUser(tenantId: string, userId: string) {
  const directorId = getAccessPolicy().directorUserId;
  return prisma.user.findFirst({
    where: {
      id: userId,
      tenant: "export",
      tenantId,
      isActive: true,
      ...assignableExportUserWhere(directorId),
    },
    select: { id: true },
  });
}
