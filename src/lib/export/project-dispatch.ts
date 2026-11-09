import { PROJECT_DEMAND_DEFAULT } from "../export-constants";

const PATH_ID = /(?:project(?:-detail)?s?)\/(\d{5,})/i;
const QUERY_ID = /(?:^|[?&#])(?:projectid|project_id|projectnumber|project_number|lmid|lm)=(\d{5,})/i;
const LABELED = /\bLM\s*[:#-]?\s*(\d{5,})\b/i;
const PLAIN = /^\d{5,}$/;

/**
 * 从 LeadManager 链接或「LM 137094003」里取出项目号。
 * 只认路径和项目号参数，忽略 version 等查询，避免同一项目因链接版本不同被当成新项目。
 */
export function extractLeadManagerProjectNumber(raw: string | null | undefined): string | null {
  const text = raw?.trim() ?? "";
  if (!text) return null;
  if (PLAIN.test(text)) return text;
  if (!/https?:\/\//i.test(text) && !text.includes("/")) {
    const labeled = LABELED.exec(text);
    if (labeled) return labeled[1];
  }

  const hashIndex = text.indexOf("#");
  const beforeHash = hashIndex >= 0 ? text.slice(0, hashIndex) : text;
  const hash = hashIndex >= 0 ? text.slice(hashIndex + 1) : "";
  const queryIndex = beforeHash.indexOf("?");
  const path = queryIndex >= 0 ? beforeHash.slice(0, queryIndex) : beforeHash;
  const query = queryIndex >= 0 ? beforeHash.slice(queryIndex) : "";
  const hashPath = hash.split("?")[0] ?? "";
  const hashQuery = hash.includes("?") ? hash.slice(hash.indexOf("?")) : "";
  const pathAndHash = `${path}${hashPath}`;

  const fromPath = PATH_ID.exec(pathAndHash);
  if (fromPath) return fromPath[1];

  const fromQuery = QUERY_ID.exec(query) ?? QUERY_ID.exec(hashQuery);
  if (fromQuery) return fromQuery[1];

  const pathDigits = [...pathAndHash.matchAll(/\d{6,}/g)].map((match) => match[0]);
  const unique = [...new Set(pathDigits)];
  if (unique.length === 1) return unique[0] ?? null;

  const fromLabel = LABELED.exec(pathAndHash);
  if (fromLabel) return fromLabel[1];
  return null;
}

/** 保存并分配必须有业务员和第一问。联系人姓名可以空。草稿不检查这两项。 */
export function dispatchAssignmentError(input: {
  mode: "draft" | "assign";
  ownerId: string | null;
  nextStep: string | null;
}): string | null {
  if (input.mode !== "assign") return null;
  if (!input.ownerId) return "分配前请选择业务员";
  if (!input.nextStep?.trim()) return "分配前请写明业务员要问什么";
  return null;
}

export function normalizeDemandStatus(value: string | null | undefined): string {
  const trimmed = value?.trim();
  return trimmed || PROJECT_DEMAND_DEFAULT;
}
