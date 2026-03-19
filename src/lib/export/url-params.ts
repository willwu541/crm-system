/**
 * 构建列表页 URL，保留有效参数
 */
export function buildListUrl(pathname: string, params: Record<string, string | number | undefined>) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v != null && v !== "" && String(v).trim() !== "") {
      sp.set(k, String(v));
    }
  }
  const q = sp.toString();
  return q ? `${pathname}?${q}` : pathname;
}
