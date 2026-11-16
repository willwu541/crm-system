import { LEAD_PARKED_STATUS, PROJECT_PARKED_STATUS } from "@/lib/export-constants";

/** 跟进记录里用这个类型记下线索暂缓，不计入联系次数。 */
export const LEAD_LIFECYCLE_ACTIVITY = "lifecycle";

export const DEFER_MARK_TEXT = "标为暂缓开发";
export const DEFER_UNMARK_TEXT = "取消暂缓开发";

export function isDeferredStatus(status: string | null | undefined) {
  return status === PROJECT_PARKED_STATUS || status === LEAD_PARKED_STATUS;
}

/**
 * 把 status 改成 parked，或从 parked 恢复。
 * resume 为真时忽略请求里的目标状态，用记下的原状态。
 */
export function deferStatusChange(input: {
  currentStatus: string;
  parkedFromStatus?: string | null;
  requestedStatus?: string;
  resume?: boolean;
  allowed: readonly string[];
  fallback: string;
}): { status?: string; parkedFromStatus?: string | null; log: "mark" | "unmark" | null } {
  const current = input.currentStatus;
  if (input.resume) {
    if (current !== PROJECT_PARKED_STATUS) return { log: null };
    const saved = input.parkedFromStatus;
    const status =
      saved && saved !== PROJECT_PARKED_STATUS && input.allowed.includes(saved) ? saved : input.fallback;
    return { status, parkedFromStatus: null, log: "unmark" };
  }
  if (input.requestedStatus === undefined || input.requestedStatus === current) return { log: null };
  if (input.requestedStatus === PROJECT_PARKED_STATUS) {
    return { status: PROJECT_PARKED_STATUS, parkedFromStatus: current, log: "mark" };
  }
  if (current === PROJECT_PARKED_STATUS) {
    return { status: input.requestedStatus, parkedFromStatus: null, log: "unmark" };
  }
  return { status: input.requestedStatus, log: null };
}
