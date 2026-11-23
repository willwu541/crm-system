// 与 src/lib/export/project-schedule-value.ts 的 parseProjectValueWan / parseScheduleMonthKey 保持一致。

export function parseProjectValueWan(text) {
  if (!text || !String(text).trim()) return null;
  const normalized = String(text).replace(/,/g, "").replace(/，/g, "");
  const match = normalized.match(/(\d+(?:\.\d+)?)/);
  if (!match) return null;
  const n = Number(match[1]);
  return Number.isFinite(n) ? n : null;
}

const QUARTER_START_MONTH = {
  1: 1,
  一: 1,
  第一: 1,
  2: 4,
  二: 4,
  第二: 4,
  3: 7,
  三: 7,
  第三: 7,
  4: 10,
  四: 10,
  第四: 10,
};

export function parseScheduleMonthKey(text) {
  if (!text || !String(text).trim()) return null;
  const raw = String(text).trim();

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
