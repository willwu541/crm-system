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
    <header className="border-b border-slate-200/80 bg-white/95 backdrop-blur">
      <div className="flex h-16 items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <Link href="/export/dashboard" className="text-base font-bold text-sky-800 tracking-tight">
            外贸 CRM
          </Link>
        </div>
        <div className="flex items-center gap-4">
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm text-slate-700">
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
