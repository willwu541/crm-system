/** 跟进提醒：datetime-local 与 WhatsApp 生命周期 */

export const WHATSAPP_MAINTAIN_DAYS = 7;
export const WHATSAPP_CLOSED_CUSTOMER = ["won", "lost"] as const;

export type WhatsappStage = "none" | "first_contact" | "maintain_due" | "maintain_ok";

export function toDatetimeLocalValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function daysFromNowLocal(days: number, from = new Date()): string {
  const d = new Date(from);
  d.setDate(d.getDate() + days);
  return toDatetimeLocalValue(d);
}

export function startOfLocalDay(from = new Date()): Date {
  return new Date(from.getFullYear(), from.getMonth(), from.getDate());
}

export function endOfLocalDay(from = new Date()): Date {
  return new Date(startOfLocalDay(from).getTime() + 24 * 60 * 60 * 1000);
}

export function daysAgo(days: number, from = new Date()): Date {
  return new Date(from.getTime() - days * 24 * 60 * 60 * 1000);
}

function hasValue(value: string | Date | null | undefined): value is string | Date {
  return value != null && value !== "";
}

/**
 * WhatsApp 两段式：有号码只表示可以联系；必须先留下沟通记录（联系上），之后才进入维护。
 */
export function resolveWhatsappStage(
  input: {
    hasWhatsapp: boolean;
    status: string;
    lastContactAt?: string | Date | null;
    nextFollowUpAt?: string | Date | null;
    closedStatuses?: readonly string[];
  },
  now = new Date(),
): WhatsappStage {
  if (!input.hasWhatsapp) return "none";
  const closed = input.closedStatuses ?? WHATSAPP_CLOSED_CUSTOMER;
  if (closed.includes(input.status)) return "none";
  if (!hasValue(input.lastContactAt)) return "first_contact";

  const todayEnd = endOfLocalDay(now);
  const silentSince = daysAgo(WHATSAPP_MAINTAIN_DAYS, now);
  const last = new Date(input.lastContactAt);
  const nextDue = !hasValue(input.nextFollowUpAt) || new Date(input.nextFollowUpAt) < todayEnd;
  const silentTooLong = last < silentSince;
  if (nextDue || silentTooLong) return "maintain_due";
  return "maintain_ok";
}
