"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { SessionUser } from "@/lib/auth";

export function Header({ user }: { user: SessionUser }) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const navLinks = [
    { href: "/dashboard", label: "后台概览" },
    { href: "/customers", label: "客户管理" },
    { href: "/leads", label: "线索管理" },
    { href: "/seapool", label: "公海池" },
    { href: "/customers/reactivation", label: "私域唤醒" },
    { href: "/orders", label: "订单管理" },
    { href: "/quotes", label: "客户报价" },
    { href: "/suppliers", label: "加工户管理" },
    { href: "/tasks", label: "待办任务" },
    { href: "/moments", label: "朋友圈" },
    ...(user.role === "ADMIN" || user.role === "MANAGER"
      ? [
          { href: "/admin/users", label: "用户管理" },
          { href: "/admin/logs", label: "操作日志" },
          { href: "/admin/export-deletions", label: "外贸删除记录" },
        ]
      : []),
  ];

  return (
    <header className="border-b border-slate-200 bg-white shadow-sm">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-4">
          <Link href="/orders" className="font-semibold text-teal-700">
            客户报价系统
          </Link>
          <nav className="hidden gap-4 md:flex">
            {navLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="text-sm text-slate-600 hover:text-teal-600 transition-colors"
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-2 sm:gap-4">
          <span className="hidden text-sm text-slate-600 sm:inline">
            {user.name} ({user.role === "ADMIN" ? "管理员" : user.role === "MANAGER" ? "经理" : "业务员"})
          </span>
          <button
            onClick={handleLogout}
            className="text-sm text-slate-600 hover:text-teal-600 transition-colors px-2 py-1"
          >
            退出
          </button>
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            className="md:hidden p-2 rounded-md text-slate-600 hover:bg-slate-100"
            aria-label="菜单"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {menuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>
      {menuOpen && (
        <nav className="md:hidden border-t border-slate-100 bg-slate-50 px-4 py-3 space-y-1">
          {navLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setMenuOpen(false)}
              className="block py-2 px-3 rounded-md text-sm text-slate-700 hover:bg-white hover:text-teal-600"
            >
              {l.label}
            </Link>
          ))}
          <div className="pt-2 mt-2 border-t border-slate-200 text-sm text-slate-500">
            {user.name} · {user.role === "ADMIN" ? "管理员" : user.role === "MANAGER" ? "经理" : "业务员"}
          </div>
        </nav>
      )}
    </header>
  );
}
