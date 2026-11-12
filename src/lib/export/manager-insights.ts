import { PROJECT_PROGRESS_MARKS, UNMARKED_PROGRESS_LABEL } from "@/lib/export-constants";
import { parseProjectValueWan } from "@/lib/export/project-schedule-value";

const MARKS = PROJECT_PROGRESS_MARKS as readonly string[];

export function sumProjectValueWan(texts: Array<string | null | undefined>) {
  let totalWan = 0;
  let parsedCount = 0;
  let unparsedCount = 0;
  for (const text of texts) {
    if (!text?.trim()) continue;
    const value = parseProjectValueWan(text);
    if (value == null) unparsedCount += 1;
    else {
      totalWan += value;
      parsedCount += 1;
    }
  }
  return {
    totalWan,
    parsedCount,
    unparsedCount,
  };
}

/** 固定顺序输出进度标记计数，空值和未知值归到「未标记」。 */
export function progressMarkCounts(rows: Array<{ mark: string | null; count: number }>) {
  const map = new Map<string, number>();
  for (const row of rows) {
    const key = row.mark && MARKS.includes(row.mark) ? row.mark : UNMARKED_PROGRESS_LABEL;
    map.set(key, (map.get(key) ?? 0) + row.count);
  }
  return [
    ...PROJECT_PROGRESS_MARKS.map((mark) => ({ mark, count: map.get(mark) ?? 0 })),
    { mark: UNMARKED_PROGRESS_LABEL, count: map.get(UNMARKED_PROGRESS_LABEL) ?? 0 },
  ];
}
