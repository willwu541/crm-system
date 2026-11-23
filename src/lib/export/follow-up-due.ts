const DAY_MS = 24 * 60 * 60 * 1000;

export const FOLLOW_UP_DUE_MODES = ["overdue", "today", "week"] as const;
export type FollowUpDueMode = (typeof FOLLOW_UP_DUE_MODES)[number];

export function isFollowUpDueMode(value: string | null | undefined): value is FollowUpDueMode {
  return (FOLLOW_UP_DUE_MODES as readonly string[]).includes(value ?? "");
}

function shanghaiDayStart(now: Date) {
  const text = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  const [year, month, day] = text.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, -8, 0, 0));
}

/** 下次跟进筛选，按东八区日界。overdue 是今天之前；today 是今天；week 是今天起 7 天内。 */
export function followUpDueWhere(mode: string | null | undefined, now = new Date()) {
  if (!isFollowUpDueMode(mode)) return null;
  const start = shanghaiDayStart(now);
  if (mode === "overdue") return { lt: start };
  if (mode === "today") return { gte: start, lt: new Date(start.getTime() + DAY_MS) };
  return { gte: start, lt: new Date(start.getTime() + 7 * DAY_MS) };
}

/** 接收 YYYY-MM-DD 或 ISO。日期按东八区当天零点存。空串、null 表示清空；非法返回 undefined。 */
export function parseFollowUpDate(value: string | null | undefined): Date | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value.trim() === "") return null;
  const raw = value.trim();
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  if (dateOnly) {
    const year = Number(dateOnly[1]);
    const month = Number(dateOnly[2]);
    const day = Number(dateOnly[3]);
    const d = new Date(Date.UTC(year, month - 1, day, -8, 0, 0));
    const check = new Date(d.getTime() + 8 * 60 * 60 * 1000);
    if (check.getUTCFullYear() !== year || check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day) {
      return undefined;
    }
    return d;
  }
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? undefined : shanghaiDayStart(d);
}

/** 东八区 YYYY-MM-DD，给日期输入框和活动记录用。 */
export function formatFollowUpDate(value: string | Date | null | undefined): string {
  if (value == null || value === "") return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function sameFollowUpDay(a: Date | null | undefined, b: Date | null | undefined) {
  return formatFollowUpDate(a ?? null) === formatFollowUpDate(b ?? null);
}
