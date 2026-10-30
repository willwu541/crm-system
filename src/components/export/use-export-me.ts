"use client";

import { useEffect, useState } from "react";

export interface ExportMe {
  id: string;
  name: string;
  role: "ADMIN" | "MANAGER" | "SALES";
}

export function useExportMe() {
  const [me, setMe] = useState<ExportMe | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((j: { user?: ExportMe }) => {
        if (!cancelled && j.user) setMe(j.user);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);
  return me;
}
