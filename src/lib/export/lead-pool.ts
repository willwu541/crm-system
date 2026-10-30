import type { SessionUser } from "@/lib/auth";
import { canSeeOwner, exportDataOwnerFilter, exportDataOwnerIds, isDirector } from "@/lib/access-policy";

/** 每人每天最多从公海认领的条数。管理员分配不受此限制。 */
export const DAILY_LEAD_CLAIM_LIMIT = 50;

const LOCKED_KEYS = [
  "email",
  "phone",
  "whatsapp",
  "linkedin",
  "facebook",
  "tiktok",
  "address",
  "notes",
  "fitEvidence",
  "lastOutcome",
] as const;

export function startOfLocalDay(now = new Date()) {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

/** 管理员，以及被设为业务经理的人，能看全部线索。 */
export function isExportAdmin(user: Pick<SessionUser, "id" | "role">) {
  return user.role === "ADMIN" || isDirector(user);
}

/** 只有管理者可以分配线索和项目。业务经理只接收分配，不能再分给别人。 */
export function canAssignExportWork(user: Pick<SessionUser, "id" | "role">) {
  return user.role === "ADMIN" && !isDirector(user);
}

function grantedOwnerIds(user: Pick<SessionUser, "id" | "role">) {
  return exportDataOwnerIds(user) ?? [user.id];
}

export function canViewExportLead(user: Pick<SessionUser, "id" | "role">, ownerId?: string | null) {
  if (isExportAdmin(user)) return true;
  if (!ownerId) return true;
  return grantedOwnerIds(user).includes(ownerId);
}

/** 可以改资料、删除。公海里的线索还没有负责人，不能直接改；经理即使被允许查看，也不能改别人的线索。 */
export function canWorkExportLead(user: Pick<SessionUser, "id" | "role">, ownerId?: string | null) {
  if (isExportAdmin(user)) return true;
  return Boolean(ownerId && ownerId === user.id);
}

/**
 * 公海线索谁都可以开始用。已经归别人的线索，其他人不能接手。
 * 找线索、补联系方式、记深挖不写负责人。认领、记真正跟进或转成客户才写。
 */
export function canStartUsingExportLead(user: Pick<SessionUser, "id" | "role">, ownerId?: string | null) {
  if (isExportAdmin(user)) return true;
  if (!ownerId) return true;
  return ownerId === user.id;
}

/** 新建一律进公海，不因创建人写入负责人。 */
export function newExportLeadAssignment(): { ownerId: null; claimedAt: null } {
  return { ownerId: null, claimedAt: null };
}

/**
 * 还挂在某人名下，但没有转成客户。
 * 找线索时写下的联系方式和深挖不算开发。调用方还要排除已经有认领记录的线索。
 */
export function isUndevelopedOwnedLead(lead: {
  ownerId?: string | null;
  convertedToCustomerId?: string | null;
  status?: string | null;
}) {
  if (!lead.ownerId) return false;
  if (lead.convertedToCustomerId) return false;
  if (lead.status === "converted") return false;
  return true;
}

/** 公海联系方式认领前不给看。已归某人的线索，本人、管理者，以及被允许的经理可以看到。 */
export function canSeeExportLeadContacts(user: Pick<SessionUser, "id" | "role">, ownerId?: string | null) {
  if (isExportAdmin(user)) return true;
  if (!ownerId) return false;
  return grantedOwnerIds(user).includes(ownerId);
}

export function canSeeExportCustomer(user: Pick<SessionUser, "id" | "role">, ownerId?: string | null) {
  if (isExportAdmin(user)) return true;
  return canSeeOwner(exportDataOwnerFilter(user), ownerId);
}

/** 只能改自己的客户。经理即使被允许查看，也不能改负责人、删除或把客户拿走。 */
export function canWorkExportCustomer(user: Pick<SessionUser, "id" | "role">, ownerId?: string | null) {
  if (isExportAdmin(user)) return true;
  return Boolean(ownerId && ownerId === user.id);
}

export const EXPORT_OWNED_BY_OTHER = "这条资料已经有负责人，只能查看，不能修改、删除或改到自己名下。";

function ownedClause(ids: string[]) {
  return ids.length === 1 ? { ownerId: ids[0] } : { ownerId: { in: ids } };
}

/**
 * 非管理员：公海 + 自己的，经理再加上管理者勾选的人。scope 再收窄。
 * 管理员不传 scope 时不附加条件。
 */
export function leadVisibilityWhere(
  user: Pick<SessionUser, "id" | "role">,
  scope?: string | null,
): Record<string, unknown> | null {
  if (isExportAdmin(user)) {
    if (scope === "pool") return { ownerId: null };
    if (scope === "mine") return { ownerId: user.id };
    return null;
  }
  if (scope === "pool") return { ownerId: null };
  if (scope === "mine") return { ownerId: user.id };
  return { OR: [{ ownerId: null }, ownedClause(grantedOwnerIds(user))] };
}

function filled(value: unknown) {
  return typeof value === "string" && value.trim().length > 0;
}

export function presentExportLead<T extends { ownerId?: string | null; convertedToCustomerId?: string | null }>(
  lead: T,
  user: Pick<SessionUser, "id" | "role">,
) {
  const ownerId = lead.ownerId ?? null;
  const inPool = !ownerId;
  const contactsLocked = !canSeeExportLeadContacts(user, ownerId);
  const record = lead as T & Record<string, unknown>;
  const flags = {
    inPool,
    contactsLocked,
    hasEmail: filled(record.email),
    hasPhone: filled(record.phone),
    hasWhatsapp: filled(record.whatsapp),
    canClaim: inPool && !isExportAdmin(user),
    canWork: canWorkExportLead(user, ownerId),
    canRelease: isExportAdmin(user) && !inPool && !lead.convertedToCustomerId,
  };
  if (!contactsLocked) return { ...lead, ...flags };
  const masked: Record<string, unknown> = { ...lead };
  for (const key of LOCKED_KEYS) {
    if (key in masked) masked[key] = null;
  }
  return { ...masked, ...flags } as T & typeof flags;
}
