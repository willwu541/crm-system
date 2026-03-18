"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { SessionUser } from "@/lib/auth";

export function Header({ user }: { user: SessionUser }) {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="border-b border-slate-200 bg-white shadow-sm">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
        <div className="flex items-center gap-8">
          <Link href="/orders" className="font-semibold text-teal-700">
            河北双亿-伟荣-wiberg · 钢格板业务系统
          </Link>
          <nav className="flex gap-4">
            <Link
              href="/orders"
              className="text-sm text-slate-600 hover:text-teal-600 transition-colors"
            >
              订单管理
            </Link>
            <Link
              href="/suppliers"
              className="text-sm text-slate-600 hover:text-teal-600 transition-colors"
            >
              加工户管理
            </Link>
            {user.role === "ADMIN" && (
              <Link
                href="/admin/users"
                className="text-sm text-slate-600 hover:text-teal-600 transition-colors"
              >
                用户管理
              </Link>
            )}
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-600">
            {user.name} ({user.role === "ADMIN" ? "管理员" : "业务员"})
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
