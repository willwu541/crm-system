import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { SessionUser } from "@/lib/auth";
import { formatRole } from "@/lib/role-labels";

export type DataOwnerFilter = { ownerIds: string[] };

export type AccessPolicy = {
  directorUserId: string | null;
  canView: Record<string, string[]>;
  /** 外贸用户是否可用公海。未写入时默认可用。 */
  canUsePool: Record<string, boolean>;
};

const CONFIG_PATH = path.join(process.cwd(), "data", "access-policy.json");

const DEFAULT_POLICY: AccessPolicy = {
  directorUserId: null,
  canView: {},
  canUsePool: {},
};

let cached: AccessPolicy | null = null;

function uniqueIds(ids: string[]) {
  return Array.from(new Set(ids.filter(Boolean)));
}

function normalize(raw: Partial<AccessPolicy> & {
  managerCanViewAll?: boolean;
  salesCanViewAll?: boolean;
} | null | undefined): AccessPolicy {
  const canView: Record<string, string[]> = {};
  for (const [viewerId, ownerIds] of Object.entries(raw?.canView ?? {})) {
    const cleaned = uniqueIds((ownerIds ?? []).filter((id) => id !== viewerId));
    if (cleaned.length) canView[viewerId] = cleaned;
  }
  const canUsePool: Record<string, boolean> = {};
  for (const [userId, allowed] of Object.entries(raw?.canUsePool ?? {})) {
    if (userId) canUsePool[userId] = Boolean(allowed);
  }
  return {
    directorUserId: raw?.directorUserId ?? null,
    canView,
    canUsePool,
  };
}

export function getAccessPolicy(): AccessPolicy {
  if (cached) return cached;
  try {
    cached = normalize(JSON.parse(readFileSync(CONFIG_PATH, "utf-8")) as Partial<AccessPolicy>);
  } catch {
    cached = { ...DEFAULT_POLICY, canView: {}, canUsePool: {} };
  }
  return cached;
}

export function saveAccessPolicy(
  next: Omit<AccessPolicy, "canUsePool"> & { canUsePool?: Record<string, boolean> },
): AccessPolicy {
  cached = normalize(next);
  mkdirSync(path.dirname(CONFIG_PATH), { recursive: true });
  writeFileSync(CONFIG_PATH, JSON.stringify(cached, null, 2), "utf-8");
  return cached;
}

export function isDirector(user: Pick<SessionUser, "id">) {
  const directorId = getAccessPolicy().directorUserId;
  return Boolean(directorId && directorId === user.id);
}

export function roleLabel(role: string, userId?: string) {
  return formatRole(role, Boolean(userId && isDirector({ id: userId })));
}

/** null = 可看全部 */
export function visibleOwnerIds(user: SessionUser): string[] | null {
  if (isDirector(user)) return null;
  const policy = getAccessPolicy();
  if (!policy.directorUserId) {
    if (user.role === "ADMIN" || user.role === "MANAGER") return null;
    return [user.id];
  }
  const extra = policy.canView[user.id] ?? [];
  return uniqueIds([user.id, ...extra]);
}

export function isOwnDataOnly(user: SessionUser) {
  const ids = visibleOwnerIds(user);
  return Boolean(ids && ids.length === 1);
}

export function ownerPrismaValue(filter?: DataOwnerFilter | null) {
  if (!filter?.ownerIds.length) return undefined;
  return filter.ownerIds.length === 1 ? filter.ownerIds[0] : { in: filter.ownerIds };
}

/**
 * 列表业务员条件：可看范围内，下拉或按姓名命中的人可以再收窄到一个人。
 * 有查看范围时以前会忽略 ownerId，导致搜「姚璐译」仍出现其他人的数据。
 */
export function resolveListOwnerConstraint(
  ownerFilter: DataOwnerFilter | null | undefined,
  selectedOwnerId?: string,
  matchedOwnerIds?: string[],
): string | { in: string[] } | undefined {
  const allowed = ownerFilter?.ownerIds;
  let ids: string[] | undefined;

  if (selectedOwnerId) ids = [selectedOwnerId];
  if (matchedOwnerIds?.length) {
    ids = ids ? ids.filter((id) => matchedOwnerIds.includes(id)) : [...matchedOwnerIds];
  }

  if (ids) {
    if (allowed?.length) ids = ids.filter((id) => allowed.includes(id));
    if (!ids.length) return { in: [] };
    return ids.length === 1 ? ids[0] : { in: ids };
  }

  return ownerPrismaValue(ownerFilter);
}

export function canSeeOwner(filter: DataOwnerFilter | undefined | null, ownerId?: string | null) {
  if (!filter) return true;
  return Boolean(ownerId && filter.ownerIds.includes(ownerId));
}

export function prismaOwnerWhere(filter?: DataOwnerFilter | null) {
  const ownerId = ownerPrismaValue(filter);
  return ownerId === undefined ? {} : { ownerId };
}

export function prismaCreatedByWhere(filter?: DataOwnerFilter | null) {
  const createdById = ownerPrismaValue(filter);
  return createdById === undefined ? {} : { createdById };
}

export function exportOwnerFilter(user: SessionUser): DataOwnerFilter | undefined {
  const ids = visibleOwnerIds(user);
  return ids ? { ownerIds: ids } : undefined;
}

export function ownerScope(user: SessionUser) {
  return prismaOwnerWhere(exportOwnerFilter(user));
}

export function createdByScope(user: SessionUser) {
  return prismaCreatedByWhere(exportOwnerFilter(user));
}

export function canClaimDirector(user: SessionUser) {
  return user.role === "ADMIN" && !getAccessPolicy().directorUserId;
}

export function canEditAccessPolicy(user: Pick<SessionUser, "id" | "role">) {
  return user.role === "ADMIN" || isDirector(user);
}

/** 只有管理者能改公海开关。业务经理不行。 */
export function canEditPoolAccess(user: Pick<SessionUser, "id" | "role">) {
  return user.role === "ADMIN" && !isDirector(user);
}

/**
 * 外贸数据范围。管理者看全部；经理只看自己和管理者勾选的人；业务员只看自己。
 * 公海另由 canUseExportPool 控制。
 */
export function exportDataOwnerIds(user: Pick<SessionUser, "id" | "role">): string[] | null {
  if (user.role === "ADMIN" || isDirector(user)) return null;
  if (user.role === "MANAGER") {
    const extra = getAccessPolicy().canView[user.id] ?? [];
    return uniqueIds([user.id, ...extra]);
  }
  return [user.id];
}

/** 只有管理者始终可用公海。其他人按权限开关，未设置时默认可用。 */
export function canUseExportPool(user: Pick<SessionUser, "id" | "role">) {
  if (canEditPoolAccess(user)) return true;
  const flagged = getAccessPolicy().canUsePool[user.id];
  return flagged !== false;
}

export function exportDataOwnerFilter(user: Pick<SessionUser, "id" | "role">): DataOwnerFilter | undefined {
  const ids = exportDataOwnerIds(user);
  return ids ? { ownerIds: ids } : undefined;
}

export function resetAccessPolicyCache() {
  cached = null;
}
