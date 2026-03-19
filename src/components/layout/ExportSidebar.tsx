"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/export/dashboard", label: "Dashboard" },
  { href: "/export/leads", label: "Leads 线索" },
  { href: "/export/customers", label: "Customers 客户" },
  { href: "/export/quotes", label: "Quotes 报价" },
  { href: "/export/orders", label: "Orders 订单" },
  { href: "/export/tasks", label: "Tasks 任务" },
];

export function ExportSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-52 shrink-0 border-r border-slate-200 bg-white">
      <nav className="flex flex-col gap-0.5 p-3">
        {NAV_ITEMS.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/export/dashboard" && pathname.startsWith(item.href + "/"));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-teal-50 text-teal-700"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-800"
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
