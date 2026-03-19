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
    <header className="border-b border-slate-200 bg-white shadow-sm">
      <div className="flex h-14 items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <Link href="/export/dashboard" className="font-semibold text-teal-700">
            外贸 CRM
          </Link>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-600">
            {user.name} ({user.role === "ADMIN" ? "Admin" : "Sales"})
          </span>
          <button
            onClick={handleLogout}
            className="text-sm text-slate-600 hover:text-teal-600 transition-colors"
          >
            退出
          </button>
        </div>
      </div>
    </header>
  );
}
