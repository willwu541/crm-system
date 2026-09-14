import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { SessionUser } from "@/lib/auth";
import { formatRole } from "@/lib/role-labels";

export type DataOwnerFilter = { ownerIds: string[] };

export type AccessPolicy = {
  directorUserId: string | null;
  canView: Record<string, string[]>;
};

const CONFIG_PATH = path.join(process.cwd(), "data", "access-policy.json");

const DEFAULT_POLICY: AccessPolicy = {
  directorUserId: null,
  canView: {},
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
  return {
    directorUserId: raw?.directorUserId ?? null,
    canView,
  };
}

export function getAccessPolicy(): AccessPolicy {
  if (cached) return cached;
  try {
    cached = normalize(JSON.parse(readFileSync(CONFIG_PATH, "utf-8")) as Partial<AccessPolicy>);
  } catch {
    cached = { ...DEFAULT_POLICY, canView: {} };
  }
  return cached;
}

export function saveAccessPolicy(next: AccessPolicy): AccessPolicy {
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

export function canEditAccessPolicy(user: SessionUser) {
  return isDirector(user);
}

export function resetAccessPolicyCache() {
  cached = null;
}
