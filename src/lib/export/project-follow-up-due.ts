import { FOLLOW_UP_DUE_MODES, followUpDueWhere, type FollowUpDueMode } from "./follow-up-due";

export const PROJECT_FOLLOW_UP_DUE_MODES = FOLLOW_UP_DUE_MODES;
export type ProjectFollowUpDue = FollowUpDueMode;

export const projectFollowUpDueLabel: Record<ProjectFollowUpDue, string> = {
  overdue: "已逾期",
  today: "今天",
  week: "7 天内",
};

export function isProjectFollowUpDue(value: string | null | undefined): value is ProjectFollowUpDue {
  return (PROJECT_FOLLOW_UP_DUE_MODES as readonly string[]).includes(value ?? "");
}

function shanghaiParts(now: Date) {
  const text = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  const [year, month, day] = text.split("-").map(Number);
  return { year, month, day };
}

/** 东八区当天 0 点。 */
export function shanghaiDayStart(now = new Date()) {
  const { year, month, day } = shanghaiParts(now);
  return new Date(Date.UTC(year, month - 1, day, -8, 0, 0));
}

/** 与列表接口同一口径：overdue 早于今天；today 今天内；week 今天起 7 天内。 */
export const projectFollowUpDueWhere = followUpDueWhere;

export function isFollowUpOverdue(value: string | Date | null | undefined, now = new Date()) {
  if (value == null || value === "") return false;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  return date.getTime() < shanghaiDayStart(now).getTime();
}

/** 东八区日期 YYYY-MM-DD。 */
export function formatShanghaiDate(value: string | Date | null | undefined): string | null {
  if (value == null || value === "") return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const { year, month, day } = shanghaiParts(date);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}
