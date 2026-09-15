/** 清空输入时写成 null，避免 PATCH 省略字段导致旧号码删不掉 */
export function blankToNull(value: string | null | undefined): string | null | undefined {
  if (value == null) return value;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export const EXPORT_CLEARABLE_CONTACT_FIELDS = [
  "email",
  "phone",
  "whatsapp",
  "linkedin",
  "facebook",
  "tiktok",
  "website",
  "title",
  "language",
  "notes",
] as const;

export function nullifyBlankFields<T extends Record<string, unknown>>(
  data: T,
  keys: readonly string[] = EXPORT_CLEARABLE_CONTACT_FIELDS,
): T {
  const next = { ...data } as Record<string, unknown>;
  for (const key of keys) {
    if (!(key in next) || next[key] === undefined) continue;
    if (typeof next[key] === "string") {
      next[key] = blankToNull(next[key] as string);
    }
  }
  return next as T;
}
