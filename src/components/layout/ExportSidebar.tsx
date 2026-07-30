"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/export/dashboard", label: "工作台" },
  { href: "/export/inbox", label: "统一收件箱" },
  { href: "/export/leads", label: "线索" },
  { href: "/export/customers", label: "客户" },
  { href: "/export/quotes", label: "报价" },
  { href: "/export/orders", label: "订单" },
  { href: "/export/tasks", label: "任务" },
  { href: "/export/templates", label: "邮件模板" },
  { href: "/export/resources", label: "资料库" },
];

export function ExportSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-60 shrink-0 border-r border-white/10 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-800 text-slate-100 shadow-[0_10px_35px_rgba(2,6,23,0.35)]">
      <div className="border-b border-white/10 px-4 py-4">
        <p className="text-xs uppercase tracking-[0.2em] text-sky-300">Export CRM</p>
        <p className="mt-1 text-sm font-semibold text-white">钢格板外贸系统</p>
      </div>
      <nav className="flex flex-col gap-1 p-3">
        {NAV_ITEMS.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/export/dashboard" && pathname.startsWith(item.href + "/"));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-sky-500/20 text-sky-100 shadow-[inset_0_0_0_1px_rgba(56,189,248,0.55)]"
                  : "text-slate-300 hover:bg-white/10 hover:text-white"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
