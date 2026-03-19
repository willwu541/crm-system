/**
 * interestedProducts 多选字段的封装
 * 存储使用 String[]，兼容逗号分隔字符串输入
 */

export function parseInterestedProducts(
  val: string | string[] | null | undefined
): string[] {
  if (val == null) return [];
  if (Array.isArray(val)) {
    return val.filter(Boolean).map((s) => String(s).trim()).filter(Boolean);
  }
  const s = String(val).trim();
  if (!s) return [];
  return s.split(",").map((x) => x.trim()).filter(Boolean);
}

export function serializeInterestedProducts(arr: string[]): string[] {
  return Array.isArray(arr) ? arr.filter(Boolean).map(String) : [];
}

export function toDisplayString(arr: string[]): string {
  return Array.isArray(arr) ? arr.filter(Boolean).join(", ") : "";
}
