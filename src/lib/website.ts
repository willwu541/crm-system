export function normalizeWebsiteUrl(value?: string | null): string | null {
  const raw = value?.trim();
  if (!raw) return null;

  if (/^https?:\/\//i.test(raw)) return raw;
  return `https://${raw}`;
}

export function getWebsiteHost(value?: string | null): string | null {
  const normalized = normalizeWebsiteUrl(value);
  if (!normalized) return null;

  try {
    return new URL(normalized).host.replace(/^www\./i, "");
  } catch {
    return value?.trim() || null;
  }
}
