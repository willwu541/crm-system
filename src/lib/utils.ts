import { type ClassValue, clsx } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

/**
 * 将 Prisma 返回的数据序列化为可传递给 Client Component 的 plain object
 * 处理 Decimal、Date 等非 JSON 可序列化类型
 */
export function serializeForClient<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== "object") return obj;
  if (obj instanceof Date) return obj.toISOString() as T;

  const o = obj as Record<string, unknown>;
  if (typeof o.toNumber === "function") return Number(o.toNumber()) as T;
  if (typeof o.valueOf === "function") {
    const v = o.valueOf();
    if (typeof v === "number") return v as T;
  }
  const ctor = (obj as object).constructor;
  if (ctor?.name === "Decimal" && typeof o.toString === "function") {
    return Number(o.toString()) as T;
  }

  if (Array.isArray(obj)) return obj.map(serializeForClient) as T;

  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    result[k] = serializeForClient(v);
  }
  return result as T;
}

/** 生成订单编号，格式: XJ + 年月日 + 4位随机 */
export function generateOrderNo(): string {
  const now = new Date();
  const y = now.getFullYear().toString().slice(-2);
  const m = (now.getMonth() + 1).toString().padStart(2, "0");
  const d = now.getDate().toString().padStart(2, "0");
  const r = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, "0");
  return `XJ${y}${m}${d}${r}`;
}

/** 生成唯一 token */
export function generateToken(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 15)}`;
}
