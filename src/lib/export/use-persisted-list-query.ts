"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { clearListQuery, loadListQuery, saveListQuery } from "@/lib/export/list-filter-storage";

/**
 * 列表页筛选写入 sessionStorage；无 URL 参数时自动恢复，避免进详情再返回后重选。
 * 返回 hydrated=false 时不要发列表请求，避免先刷出未筛选数据。
 */
export function usePersistedListQuery(listPath: string) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (pathname !== listPath) {
      setHydrated(true);
      return;
    }
    const current = searchParams.toString();
    if (current) {
      saveListQuery(listPath, current);
      setHydrated(true);
      return;
    }
    const saved = loadListQuery(listPath);
    if (saved) {
      router.replace(`${listPath}?${saved}`);
      return;
    }
    setHydrated(true);
  }, [listPath, pathname, router, searchParams]);

  function resetListQuery() {
    clearListQuery(listPath);
    router.replace(listPath);
  }

  return { hydrated, resetListQuery };
}
