"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard, Phone, Users, Waves, FileText,
  ClipboardList, CheckSquare, MessageCircle,
  Factory, BellRing, Settings, ScrollText, ChevronLeft, ChevronRight
} from "lucide-react";

interface Props {
  userName: string;
  userRole: string;
}

const ICON_CLASS = "h-4 w-4 flex-shrink-0";

const NAV_ITEMS = [
  { href: "/dashboard", label: "工作台", Icon: LayoutDashboard },
  { href: "/leads", label: "线索", Icon: Phone },
  { href: "/customers", label: "客户", Icon: Users },
  { href: "/seapool", label: "公海", Icon: Waves },
  { href: "/quotes", label: "报价", Icon: FileText },
  { href: "/orders", label: "订单", Icon: ClipboardList },
  { href: "/tasks", label: "待办", Icon: CheckSquare },
  { href: "/moments", label: "朋友圈", Icon: MessageCircle },
];

const ADMIN_ITEMS = [
  { href: "/suppliers", label: "加工户", Icon: Factory },
  { href: "/customers/reactivation", label: "私域唤醒", Icon: BellRing },
  { href: "/admin/users", label: "用户管理", Icon: Settings },
  { href: "/admin/logs", label: "操作日志", Icon: ScrollText },
];

export function DomesticSidebar({ userName, userRole }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const isAdmin = userRole === "ADMIN" || userRole === "MANAGER";

  const items = isAdmin ? [...NAV_ITEMS, ...ADMIN_ITEMS] : NAV_ITEMS;

  const roleLabel = userRole === "ADMIN" ? "管理员" : userRole === "MANAGER" ? "经理" : "业务员";

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className={`shrink-0 border-r border-slate-200/60 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-800 text-slate-100 flex flex-col transition-all duration-200 ${collapsed ? "w-[60px]" : "w-[200px]"}`}>
      {/* 品牌区 */}
      {collapsed ? (
        <div className="flex items-center justify-center py-4">
          <div className="h-8 w-8 rounded-lg bg-teal-500/20 flex items-center justify-center">
            <span className="text-sm font-bold text-teal-300">格</span>
          </div>
        </div>
      ) : (
        <div className="px-4 py-4">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-teal-500/20 flex items-center justify-center">
              <span className="text-sm font-bold text-teal-300">格</span>
            </div>
            <div>
              <p className="text-xs text-slate-400">钢格板内贸CRM</p>
              <p className="text-sm font-semibold text-white">客户报价系统</p>
            </div>
          </div>
        </div>
      )}

      {/* 导航 */}
      <nav className="flex flex-col gap-0.5 px-2 flex-1 py-2">
        {items.map(({ href, label, Icon }) => {
          const isActive =
            pathname === href ||
            (href !== "/dashboard" && pathname.startsWith(href + "/"));
          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-all ${
                isActive
                  ? "bg-teal-500/15 text-teal-100 ring-1 ring-teal-500/30"
                  : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
              }`}
            >
              <Icon className={ICON_CLASS} />
              {!collapsed && <span>{label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* 用户区 */}
      <div className="border-t border-white/5 p-3">
        {collapsed ? (
          <div className="flex justify-center">
            <div className="h-8 w-8 rounded-full bg-teal-500/20 flex items-center justify-center">
              <span className="text-xs font-bold text-teal-300">{userName.charAt(0)}</span>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-sm font-medium text-white truncate">{userName}</p>
              <p className="text-xs text-slate-500">{roleLabel}</p>
            </div>
            <button
              onClick={handleLogout}
              className="flex-shrink-0 rounded-md px-2 py-1 text-xs text-slate-500 hover:bg-white/5 hover:text-slate-300 transition-colors"
            >
              退出
            </button>
          </div>
        )}
      </div>

      {/* 折叠按钮 */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="mx-auto mb-3 flex h-6 w-6 items-center justify-center rounded-full bg-white/5 text-xs text-slate-500 hover:bg-white/10 hover:text-slate-300 transition-colors"
      >
        {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
      </button>
    </aside>
  );
}
