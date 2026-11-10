import { displayLabel, projectStageLabel } from "@/lib/export-display-labels";

function formatUpdateStamp(at: Date = new Date()) {
  const y = at.getFullYear();
  const m = String(at.getMonth() + 1).padStart(2, "0");
  const d = String(at.getDate()).padStart(2, "0");
  const hh = String(at.getHours()).padStart(2, "0");
  const mm = String(at.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${d} ${hh}:${mm}`;
}

function stageText(stage: string | null | undefined) {
  if (!stage) return "";
  return displayLabel(projectStageLabel, stage);
}

/** 把一次「更新」写成可追加到 notes 的段落（新的在上）。 */
export function buildProjectUpdateNoteEntry(input: {
  note: string;
  stage?: string | null;
  previousStage?: string | null;
  at?: Date;
}) {
  const body = input.note.trim();
  const stamp = formatUpdateStamp(input.at);
  const parts: string[] = [`[更新 ${stamp}]`];

  if (input.stage && input.previousStage && input.stage !== input.previousStage) {
    parts.push(`阶段：${stageText(input.previousStage)} → ${stageText(input.stage)}`);
  } else if (input.stage) {
    parts.push(`阶段：${stageText(input.stage)}`);
  }

  if (body) parts.push(body);
  return parts.join("\n");
}

export function appendProjectUpdateNote(
  existing: string | null | undefined,
  entry: string,
) {
  const next = entry.trim();
  if (!next) return (existing ?? "").trim() || null;
  const prev = (existing ?? "").trim();
  return prev ? `${next}\n\n${prev}` : next;
}
