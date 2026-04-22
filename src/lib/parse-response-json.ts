/**
 * 安全解析 fetch 的 Response，避免空 body 触发
 * "Failed to execute 'json' on 'Response': Unexpected end of JSON input"
 */
export async function parseResponseJson<T = Record<string, unknown>>(
  res: Response
): Promise<T> {
  const text = await res.text();
  if (!text?.trim()) {
    throw new Error(
      "服务器无有效响应（可能接口报错、未登录或数据库未迁移）。请稍后重试或联系管理员。"
    );
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error("服务器返回了非 JSON 内容，请确认已部署最新版本。");
  }
}
