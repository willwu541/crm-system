"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const NAV_ITEMS = [
  { href: "/export/dashboard", label: "工作台" },
  { href: "/export/live-chat", label: "网站询盘" },
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
  const [chatUnread, setChatUnread] = useState(0);

  useEffect(() => {
    let active = true;

    async function loadUnread() {
      try {
        const response = await fetch("/api/export/live-chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "list" }),
          cache: "no-store",
        });
        if (!response.ok) return;
        const data = await response.json() as {
          conversations?: Array<{ unread?: number }>;
        };
        if (!active) return;
        setChatUnread(
          (data.conversations ?? []).reduce(
            (total, conversation) => total + Number(conversation.unread || 0),
            0,
          ),
        );
      } catch {
        // Keep the navigation usable while the website chat service is unavailable.
      }
    }

    void loadUnread();
    const timer = window.setInterval(() => void loadUnread(), 3000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

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
              className={`flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                isActive
                  ? "bg-blue-500/20 text-blue-100 shadow-[inset_0_0_0_1px_rgba(96,165,250,0.65),0_8px_16px_rgba(30,64,175,0.2)]"
                  : item.href === "/export/live-chat" && chatUnread > 0
                    ? "bg-rose-500/15 text-white shadow-[inset_0_0_0_1px_rgba(251,113,133,0.7),0_0_22px_rgba(244,63,94,0.2)]"
                  : "text-slate-300 hover:bg-white/10 hover:text-white"
              }`}
            >
              <span className="flex items-center gap-2">
                {item.href === "/export/live-chat" && chatUnread > 0 && (
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-rose-500" />
                  </span>
                )}
                {item.label}
              </span>
              {item.href === "/export/live-chat" && chatUnread > 0 && (
                <span className="min-w-6 animate-pulse rounded-full bg-rose-500 px-2 py-0.5 text-center text-xs font-bold text-white shadow-lg shadow-rose-950/40">
                  {chatUnread > 99 ? "99+" : chatUnread}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
