import {
  PROJECT_ABANDONED_STATUS,
  PROJECT_LIFECYCLES,
  PROJECT_STATUSES,
} from "@/lib/export-constants";

export function isProjectStatus(value: string): value is (typeof PROJECT_STATUSES)[number] {
  return (PROJECT_STATUSES as readonly string[]).includes(value);
}

export function isProjectLifecycle(value: string): value is (typeof PROJECT_LIFECYCLES)[number] {
  return (PROJECT_LIFECYCLES as readonly string[]).includes(value);
}

export function isProjectAbandoned(status: string | null | undefined) {
  return status === PROJECT_ABANDONED_STATUS;
}

/**
 * 列表生命周期筛选。默认 active：排除废弃。
 * 若已指定精确 status，则不再叠 lifecycle（status=abandoned 可直接查废弃）。
 */
export function projectLifecycleWhere(
  lifecycle: string | null | undefined,
  explicitStatus?: string | null,
): Record<string, unknown> {
  if (explicitStatus && isProjectStatus(explicitStatus)) return {};
  const mode = lifecycle && isProjectLifecycle(lifecycle) ? lifecycle : "active";
  if (mode === "abandoned") return { status: PROJECT_ABANDONED_STATUS };
  return { status: { not: PROJECT_ABANDONED_STATUS } };
}
