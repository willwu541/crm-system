"use client";

import { ToastProvider } from "@/components/ui/Toast";

export function ExportProviders({ children }: { children: React.ReactNode }) {
  return <ToastProvider>{children}</ToastProvider>;
}
