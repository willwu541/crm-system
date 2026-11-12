import { timingSafeEqual } from "node:crypto";

export const EXPORT_AI_KEY_ENV = "EXPORT_AI_API_KEY";

export type ExportAiAuthResult =
  | { ok: true }
  | { ok: false; status: number; error: string };

/** 空密钥、未配置、错误密钥一律拒绝。长度不同也拒绝，避免 timingSafeEqual 抛错。 */
export function authorizeExportAiKey(
  authorization: string | null | undefined,
  configured = process.env[EXPORT_AI_KEY_ENV],
): ExportAiAuthResult {
  const key = (configured ?? "").trim();
  if (!key) {
    return {
      ok: false,
      status: 503,
      error: `未配置 ${EXPORT_AI_KEY_ENV}，管理者 AI 接口已关闭`,
    };
  }
  const match = /^Bearer\s+(\S+)\s*$/i.exec(authorization ?? "");
  const given = match?.[1] ?? "";
  if (!given || given.length !== key.length) {
    return { ok: false, status: 401, error: "API Key 无效" };
  }
  const same = timingSafeEqual(Buffer.from(given), Buffer.from(key));
  if (!same) return { ok: false, status: 401, error: "API Key 无效" };
  return { ok: true };
}

/** 只有鉴权通过才读取。此接口不写数据、不发信。 */
export async function readWithExportAiKey<T>(
  authorization: string | null | undefined,
  reader: () => Promise<T>,
  configured = process.env[EXPORT_AI_KEY_ENV],
): Promise<ExportAiAuthResult & { data?: T }> {
  const auth = authorizeExportAiKey(authorization, configured);
  if (!auth.ok) return auth;
  return { ok: true, data: await reader() };
}

export type ExportAiBoss = {
  id: string;
  name: string;
  email: string;
  role: "ADMIN";
  tenantId: string | null;
}
