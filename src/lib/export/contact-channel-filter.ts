/** 邮箱 / WhatsApp 筛选与抓取（去重复制） */

export const CONTACT_CHANNEL_FILTERS = [
  "email",
  "no_email",
  "whatsapp",
  "no_whatsapp",
] as const;

export type ContactChannelFilter = (typeof CONTACT_CHANNEL_FILTERS)[number];

export function isContactChannelFilter(value?: string | null): value is ContactChannelFilter {
  return !!value && (CONTACT_CHANNEL_FILTERS as readonly string[]).includes(value);
}

function nonEmptyField(field: string): Record<string, unknown> {
  return {
    AND: [{ [field]: { not: null } }, { [field]: { not: "" } }],
  };
}

function emptyField(field: string): Record<string, unknown> {
  return {
    OR: [{ [field]: null }, { [field]: "" }],
  };
}

/** 线索表上的邮箱/WhatsApp 字段筛选 */
export function leadChannelWhere(channel?: string | null): Record<string, unknown> | null {
  if (channel === "email") return nonEmptyField("email");
  if (channel === "no_email") return emptyField("email");
  if (channel === "whatsapp") return nonEmptyField("whatsapp");
  if (channel === "no_whatsapp") return emptyField("whatsapp");
  return null;
}

/** 客户：按联系人是否填写邮箱/WhatsApp */
export function customerChannelWhere(channel?: string | null): Record<string, unknown> | null {
  if (channel === "email") {
    return { contacts: { some: nonEmptyField("email") } };
  }
  if (channel === "no_email") {
    return { contacts: { none: nonEmptyField("email") } };
  }
  if (channel === "whatsapp") {
    return { contacts: { some: nonEmptyField("whatsapp") } };
  }
  if (channel === "no_whatsapp") {
    return { contacts: { none: nonEmptyField("whatsapp") } };
  }
  return null;
}

export function collectUniqueEmails(values: (string | null | undefined)[]): string[] {
  const seen = new Set<string>();
  const emails: string[] = [];
  for (const v of values) {
    const email = v?.trim();
    if (!email) continue;
    const key = email.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    emails.push(email);
  }
  return emails;
}

/** 按数字去重，保留首次出现的写法，便于批量粘贴到 WhatsApp */
export function collectUniqueWhatsapps(values: (string | null | undefined)[]): string[] {
  const seen = new Set<string>();
  const numbers: string[] = [];
  for (const v of values) {
    const raw = v?.trim();
    if (!raw) continue;
    const digits = raw.replace(/[^\d]/g, "");
    const key = digits || raw.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    numbers.push(raw);
  }
  return numbers;
}

export function collectContactField(
  contactsList: { email?: string | null; whatsapp?: string | null }[][],
  field: "email" | "whatsapp",
): string[] {
  const values: (string | null | undefined)[] = [];
  for (const contacts of contactsList) {
    for (const c of contacts) {
      values.push(c[field]);
    }
  }
  return field === "email" ? collectUniqueEmails(values) : collectUniqueWhatsapps(values);
}
