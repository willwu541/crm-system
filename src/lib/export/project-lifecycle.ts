import {
  PROJECT_ABANDONED_STATUS,
  PROJECT_LIFECYCLES,
  PROJECT_PARKED_STATUS,
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
 * 列表生命周期筛选。默认 active：排除废弃和暂缓开发。
 * 若已指定精确 status，则不再叠 lifecycle（status=abandoned 可直接查废弃）。
 */
export function projectLifecycleWhere(
  lifecycle: string | null | undefined,
  explicitStatus?: string | null,
): Record<string, unknown> {
  if (explicitStatus && isProjectStatus(explicitStatus)) return {};
  const mode = lifecycle && isProjectLifecycle(lifecycle) ? lifecycle : "active";
  if (mode === "abandoned") return { status: PROJECT_ABANDONED_STATUS };
  if (mode === "parked") return { status: PROJECT_PARKED_STATUS };
  return { status: { notIn: [PROJECT_ABANDONED_STATUS, PROJECT_PARKED_STATUS] } };
}
