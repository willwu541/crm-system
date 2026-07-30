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
    <aside className="w-60 shrink-0 border-r border-slate-800/80 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-800 text-slate-100 shadow-[0_18px_40px_rgba(2,6,23,0.45)]">
      <div className="border-b border-white/15 px-4 py-4">
        <p className="text-xs uppercase tracking-[0.2em] text-blue-300">Export CRM</p>
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
              className={`rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                isActive
                  ? "bg-blue-500/20 text-blue-100 shadow-[inset_0_0_0_1px_rgba(96,165,250,0.65),0_8px_16px_rgba(30,64,175,0.2)]"
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
