/** 与查重同一套公司名规范化：去空白、标点、大小写。 */
export function normalizeCompanyName(value?: string | null): string | null {
  const raw = value?.trim().toLowerCase();
  if (!raw) return null;
  return raw.replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "") || null;
}

/** 拆成可独立匹配的词，过短的英文（如 a / of）丢掉，避免 AND 条件过宽。 */
export function splitCompanyNameTokens(keyword: string): string[] {
  return keyword
    .trim()
    .split(/[^a-zA-Z0-9\u4e00-\u9fa5]+/)
    .map((t) => t.trim())
    .filter((t) => {
      if (!t) return false;
      if (/[\u4e00-\u9fa5]/.test(t)) return true;
      return t.length >= 2;
    });
}

export function fieldTokenAndWhere(field: string, keyword: string): Record<string, unknown> | null {
  const tokens = splitCompanyNameTokens(keyword);
  if (tokens.length < 2) return null;
  return {
    AND: tokens.map((t) => ({
      [field]: { contains: t, mode: "insensitive" },
    })),
  };
}

/**
 * 「ABC Trading Ltd」应能命中「ABC-Trading Co., Ltd」。
 * 多词时要求每个词都出现在公司名里，而不是整句精确包含。
 */
export function companyNameTokenAndWhere(keyword: string): Record<string, unknown> | null {
  return fieldTokenAndWhere("companyName", keyword);
}

export function companyNameContainsWhere(keyword: string): Record<string, unknown> {
  return { companyName: { contains: keyword.trim(), mode: "insensitive" } };
}
