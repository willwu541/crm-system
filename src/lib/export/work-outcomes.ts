export const ACTIVITY_OUTCOMES = [
  "fit_confirmed",
  "named_contact",
  "real_reply",
  "got_spec",
  "next_agreed",
  "first_touch",
  "switchboard",
  "wrong_person",
  "no_need",
  "auto_reply",
  "parked",
] as const;

export type ActivityOutcome = (typeof ACTIVITY_OUTCOMES)[number];

export const DAILY_SCORE_OUTCOMES = [
  "fit_confirmed",
  "named_contact",
  "real_reply",
  "got_spec",
  "next_agreed",
] as const;

const EMPTY_NOTE = /^(已跟进|跟进一下|跟进|any update\??|no update|update\??|fyi|ok|收到|嗯|好的)\.?$/i;

export function combinedWorkNote(...parts: Array<string | null | undefined>) {
  return parts
    .map((part) => (part ?? "").trim())
    .filter(Boolean)
    .join("\n");
}

export function isThinWorkNote(text: string | null | undefined) {
  const value = (text ?? "").trim();
  if (!value || value.length < 4) return true;
  return EMPTY_NOTE.test(value);
}

export function validateWorkLog(
  outcome: string | undefined,
  ...notes: Array<string | null | undefined>
) {
  if (!outcome || !ACTIVITY_OUTCOMES.includes(outcome as ActivityOutcome)) {
    return "请选择结果";
  }
  const note = combinedWorkNote(...notes);
  if (!note) {
    return "请填写客户反馈，写清对方是谁、做什么或下一步";
  }
  if (EMPTY_NOTE.test(note)) {
    return "请写具体内容，不要只写「已跟进」";
  }
  if (isThinWorkNote(note)) {
    return "请再写具体一点，例如对方做什么、谁负责";
  }
  return null;
}

export function companyKey(activity: { leadId?: string | null; customerId?: string | null; id: string }) {
  return activity.leadId || activity.customerId || activity.id;
}
