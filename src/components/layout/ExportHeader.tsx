"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { SessionUser } from "@/lib/auth";

export function ExportHeader({ user }: { user: SessionUser }) {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="border-b border-slate-200 bg-white/95 shadow-[0_6px_20px_rgba(15,23,42,0.06)] backdrop-blur">
      <div className="flex h-16 items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <Link href="/export/dashboard" className="text-base font-bold tracking-tight text-slate-900">
            外贸 CRM
          </Link>
        </div>
        <div className="flex items-center gap-4">
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm text-slate-700 shadow-sm">
            {user.name} ({user.role === "ADMIN" ? "Admin" : "Sales"})
          </span>
          <button
            onClick={handleLogout}
            className="export-btn-secondary rounded-md px-3 py-1.5 text-sm transition-colors"
          >
            退出
          </button>
        </div>
      </div>
    </header>
  );
}
