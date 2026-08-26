/**
 * 列表筛选持久化：进入详情再返回时恢复业务员、最近联系等条件。
 * 使用 sessionStorage，关闭标签页后自动清除。
 */

const PREFIX = "export-list-query:";

function getStorage(): Storage | null {
  try {
    const storage = (globalThis as { sessionStorage?: Storage }).sessionStorage;
    if (storage && typeof storage.setItem === "function") return storage;
  } catch {
    /* ignore private-mode / missing storage */
  }
  return null;
}

export function saveListQuery(listPath: string, query: string) {
  getStorage()?.setItem(PREFIX + listPath, query);
}

export function loadListQuery(listPath: string): string {
  return getStorage()?.getItem(PREFIX + listPath) ?? "";
}

export function clearListQuery(listPath: string) {
  getStorage()?.removeItem(PREFIX + listPath);
}

export function listHref(listPath: string): string {
  const q = loadListQuery(listPath);
  return q ? `${listPath}?${q}` : listPath;
}
