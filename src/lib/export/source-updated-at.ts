function shanghaiYmd(now: Date) {
  const text = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  const [year, month, day] = text.split("-").map(Number);
  return { year, month, day };
}

function shanghaiMidnight(year: number, month: number, day: number) {
  return new Date(Date.UTC(year, month - 1, day, -8, 0, 0));
}

/** 资料更新筛选。1 是曾经更新过，today / week 按东八区。 */
export function sourceUpdatedWhere(mode: string | null | undefined, now = new Date()) {
  if (mode === "1") return { not: null };
  if (mode !== "today" && mode !== "week") return null;
  const { year, month, day } = shanghaiYmd(now);
  const start = shanghaiMidnight(year, month, day);
  if (mode === "today") return { gte: start };
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Shanghai",
    weekday: "short",
  }).format(now);
  const index = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(weekday);
  const monday = new Date(start);
  monday.setUTCDate(monday.getUTCDate() - (index < 0 ? 0 : index));
  return { gte: monday };
}

/** 资料更新时间，东八区，到分钟。空值表示还没被标成已更新。 */
export function formatSourceUpdatedAt(value: string | Date | null | undefined): string | null {
  if (value == null || value === "") return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const pick = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  const text = `${pick("year")}-${pick("month")}-${pick("day")} ${pick("hour")}:${pick("minute")}`;
  return /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(text) ? text : null;
}
