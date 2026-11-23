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
  "nextFollowUpAt",
] as const;

export type ProjectListSortBy = (typeof PROJECT_LIST_SORT_FIELDS)[number];

export function isProjectListSortBy(value: string): value is ProjectListSortBy {
  return (PROJECT_LIST_SORT_FIELDS as readonly string[]).includes(value);
}

/** 写库时和原文一起存的数值列。 */
export function projectSortKeys(input: {
  projectValueText?: string | null;
  scheduleEnd?: string | null;
}): { projectValueWan?: number | null; scheduleEndKey?: number | null } {
  const keys: { projectValueWan?: number | null; scheduleEndKey?: number | null } = {};
  if (input.projectValueText !== undefined) keys.projectValueWan = parseProjectValueWan(input.projectValueText);
  if (input.scheduleEnd !== undefined) keys.scheduleEndKey = parseScheduleMonthKey(input.scheduleEnd);
  return keys;
}

/** 金额、完工年月区间，走 projectValueWan / scheduleEndKey 列。 */
export function projectRangeWhere(input: {
  valueMin: number | null;
  valueMax: number | null;
  scheduleEndFrom: number | null;
  scheduleEndTo: number | null;
}): Record<string, unknown> {
  const where: Record<string, unknown> = {};
  if (input.valueMin != null || input.valueMax != null) {
    where.projectValueWan = {
      ...(input.valueMin != null ? { gte: input.valueMin } : {}),
      ...(input.valueMax != null ? { lte: input.valueMax } : {}),
    };
  }
  if (input.scheduleEndFrom != null || input.scheduleEndTo != null) {
    where.scheduleEndKey = {
      ...(input.scheduleEndFrom != null ? { gte: input.scheduleEndFrom } : {}),
      ...(input.scheduleEndTo != null ? { lte: input.scheduleEndTo } : {}),
    };
  }
  return where;
}

const NULLABLE_SORT_COLUMN: Partial<Record<ProjectListSortBy, string>> = {
  projectValue: "projectValueWan",
  scheduleEnd: "scheduleEndKey",
  nextFollowUpAt: "nextFollowUpAt",
  bidDeadline: "bidDeadline",
  country: "country",
};

/** 列表排序。可空列空值排最后，最后按 id 稳定分页。 */
export function projectListOrderBy(sortBy: ProjectListSortBy, sortOrder: "asc" | "desc") {
  const column = NULLABLE_SORT_COLUMN[sortBy];
  const primary = column
    ? { [column]: { sort: sortOrder, nulls: "last" as const } }
    : { [sortBy]: sortOrder };
  return [primary, { id: "asc" as const }];
}
