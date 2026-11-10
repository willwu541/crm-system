/** 从「17073万元」「约 1,700.5 万元」等文案解析出万元数值。 */
export function parseProjectValueWan(text: string | null | undefined): number | null {
  if (!text?.trim()) return null;
  const normalized = text.replace(/,/g, "").replace(/，/g, "");
  const match = normalized.match(/(\d+(?:\.\d+)?)/);
  if (!match) return null;
  const n = Number(match[1]);
  return Number.isFinite(n) ? n : null;
}

const QUARTER_START_MONTH: Record<string, number> = {
  "1": 1,
  一: 1,
  第一: 1,
  "2": 4,
  二: 4,
  第二: 4,
  "3": 7,
  三: 7,
  第三: 7,
  "4": 10,
  四: 10,
  第四: 10,
};

/**
 * 把完工/工期原文解析成可比较的 YYYYMM。
 * 支持：2027年10月、2027年第四季度、2027-10、2027年、纯年份。
 * 季度取该季首月；仅有年份时取 1 月。
 */
export function parseScheduleMonthKey(text: string | null | undefined): number | null {
  if (!text?.trim()) return null;
  const raw = text.trim();

  const iso = /^(\d{4})[-/.](\d{1,2})(?:[-/.](\d{1,2}))?/.exec(raw);
  if (iso) {
    const year = Number(iso[1]);
    const month = Number(iso[2]);
    if (month >= 1 && month <= 12) return year * 100 + month;
  }

  const yearMonth = /(\d{4})\s*年\s*(\d{1,2})\s*月/.exec(raw);
  if (yearMonth) {
    const year = Number(yearMonth[1]);
    const month = Number(yearMonth[2]);
    if (month >= 1 && month <= 12) return year * 100 + month;
  }

  const quarterCn =
    /(\d{4})\s*年\s*(?:第\s*)?([一二三四]|第一|第二|第三|第四|[1-4])\s*季(?:度)?/.exec(raw) ??
    /(\d{4})\s*年?\s*[Qq]\s*([1-4])/.exec(raw);
  if (quarterCn) {
    const year = Number(quarterCn[1]);
    const q = quarterCn[2];
    const month = QUARTER_START_MONTH[q] ?? QUARTER_START_MONTH[q.replace(/^第/, "")];
    if (month) return year * 100 + month;
  }

  const yearOnly = /(\d{4})\s*年/.exec(raw) ?? /^(\d{4})$/.exec(raw);
  if (yearOnly) return Number(yearOnly[1]) * 100 + 1;

  return null;
}

/**
 * 筛选参数：`2027-10` 或 `2027`。
 * 仅年份时 from→1月、to→12月。
 */
export function parseScheduleBoundParam(
  raw: string | null | undefined,
  bound: "from" | "to",
): number | null {
  if (!raw?.trim()) return null;
  const text = raw.trim();
  const ym = /^(\d{4})-(\d{1,2})$/.exec(text);
  if (ym) {
    const year = Number(ym[1]);
    const month = Number(ym[2]);
    if (month >= 1 && month <= 12) return year * 100 + month;
    return null;
  }
  const yOnly = /^(\d{4})$/.exec(text);
  if (yOnly) {
    const year = Number(yOnly[1]);
    return bound === "from" ? year * 100 + 1 : year * 100 + 12;
  }
  return parseScheduleMonthKey(text);
}

export function parseOptionalNumber(raw: string | null | undefined): number | null {
  if (raw == null || String(raw).trim() === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export const PROJECT_LIST_SORT_FIELDS = [
  "createdAt",
  "updatedAt",
  "name",
  "status",
  "bidDeadline",
  "country",
  "scheduleEnd",
  "projectValue",
] as const;

export type ProjectListSortBy = (typeof PROJECT_LIST_SORT_FIELDS)[number];

export function isProjectListSortBy(value: string): value is ProjectListSortBy {
  return (PROJECT_LIST_SORT_FIELDS as readonly string[]).includes(value);
}

export function needsParsedProjectListPass(input: {
  sortBy: string;
  valueMin: number | null;
  valueMax: number | null;
  scheduleEndFrom: number | null;
  scheduleEndTo: number | null;
}): boolean {
  return (
    input.sortBy === "scheduleEnd" ||
    input.sortBy === "projectValue" ||
    input.valueMin != null ||
    input.valueMax != null ||
    input.scheduleEndFrom != null ||
    input.scheduleEndTo != null
  );
}

export function matchesProjectValueRange(
  projectValueText: string | null | undefined,
  valueMin: number | null,
  valueMax: number | null,
): boolean {
  if (valueMin == null && valueMax == null) return true;
  const value = parseProjectValueWan(projectValueText);
  if (value == null) return false;
  if (valueMin != null && value < valueMin) return false;
  if (valueMax != null && value > valueMax) return false;
  return true;
}

export function matchesScheduleEndRange(
  scheduleEnd: string | null | undefined,
  fromKey: number | null,
  toKey: number | null,
): boolean {
  if (fromKey == null && toKey == null) return true;
  const key = parseScheduleMonthKey(scheduleEnd);
  if (key == null) return false;
  if (fromKey != null && key < fromKey) return false;
  if (toKey != null && key > toKey) return false;
  return true;
}

function compareNullableNumber(a: number | null, b: number | null, order: "asc" | "desc"): number {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  const diff = a - b;
  return order === "asc" ? diff : -diff;
}

function compareText(a: string | null | undefined, b: string | null | undefined, order: "asc" | "desc"): number {
  const left = (a ?? "").trim();
  const right = (b ?? "").trim();
  if (!left && !right) return 0;
  if (!left) return 1;
  if (!right) return -1;
  const diff = left.localeCompare(right, "zh-CN");
  return order === "asc" ? diff : -diff;
}

function compareDate(a: Date | null | undefined, b: Date | null | undefined, order: "asc" | "desc"): number {
  const left = a?.getTime();
  const right = b?.getTime();
  if (left == null && right == null) return 0;
  if (left == null) return 1;
  if (right == null) return -1;
  const diff = left - right;
  return order === "asc" ? diff : -diff;
}

export type ProjectListSortRow = {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  status: string;
  bidDeadline: Date | null;
  country: string | null;
  scheduleEnd: string | null;
  projectValueText: string | null;
};

export function sortProjectListRows<T extends ProjectListSortRow>(
  rows: T[],
  sortBy: ProjectListSortBy,
  sortOrder: "asc" | "desc",
): T[] {
  return [...rows].sort((a, b) => {
    let cmp = 0;
    switch (sortBy) {
      case "projectValue":
        cmp = compareNullableNumber(
          parseProjectValueWan(a.projectValueText),
          parseProjectValueWan(b.projectValueText),
          sortOrder,
        );
        break;
      case "scheduleEnd":
        cmp = compareNullableNumber(
          parseScheduleMonthKey(a.scheduleEnd),
          parseScheduleMonthKey(b.scheduleEnd),
          sortOrder,
        );
        break;
      case "name":
        cmp = compareText(a.name, b.name, sortOrder);
        break;
      case "status":
        cmp = compareText(a.status, b.status, sortOrder);
        break;
      case "country":
        cmp = compareText(a.country, b.country, sortOrder);
        break;
      case "bidDeadline":
        cmp = compareDate(a.bidDeadline, b.bidDeadline, sortOrder);
        break;
      case "createdAt":
        cmp = compareDate(a.createdAt, b.createdAt, sortOrder);
        break;
      case "updatedAt":
      default:
        cmp = compareDate(a.updatedAt, b.updatedAt, sortOrder);
        break;
    }
    if (cmp !== 0) return cmp;
    return a.id.localeCompare(b.id);
  });
}

export function filterProjectListRowsByParsedFields<
  T extends { scheduleEnd: string | null; projectValueText: string | null },
>(
  rows: T[],
  input: {
    valueMin: number | null;
    valueMax: number | null;
    scheduleEndFrom: number | null;
    scheduleEndTo: number | null;
  },
): T[] {
  return rows.filter(
    (row) =>
      matchesProjectValueRange(row.projectValueText, input.valueMin, input.valueMax) &&
      matchesScheduleEndRange(row.scheduleEnd, input.scheduleEndFrom, input.scheduleEndTo),
  );
}

export function summarizeEntryCounts(rows: { entryStatus: string }[]) {
  const entryCounts = { pending: 0, entered: 0, all: 0 };
  for (const row of rows) {
    if (row.entryStatus === "pending" || row.entryStatus === "entered") {
      entryCounts[row.entryStatus] += 1;
    }
    entryCounts.all += 1;
  }
  return entryCounts;
}
