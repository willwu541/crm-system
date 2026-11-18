import { PROJECT_PROGRESS_MARKS } from "@/lib/export-constants";

export const AI_PROGRESS_MARKS = PROJECT_PROGRESS_MARKS;

const STAMP = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Asia/Shanghai",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** 追加一段带时间的文字。已有内容原样留在前面。 */
export function appendTimestampedNote(
  existing: string | null | undefined,
  content: string,
  at: Date,
) {
  const block = `[${STAMP.format(at)}] ${content.trim()}`;
  const prev = (existing ?? "").trim();
  if (!prev) return block;
  return `${prev}\n\n${block}`;
}

export function progressMarkActivityText(mark: string) {
  return `进度标记改为${mark}`;
}
