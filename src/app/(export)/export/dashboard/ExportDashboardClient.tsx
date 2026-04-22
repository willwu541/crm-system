"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { parseResponseJson } from "@/lib/parse-response-json";
import { customerStatusLabel } from "@/lib/export-display-labels";

interface DashboardData {
  todayFollowUpCount: number;
  overdueFollowUpCount: number;
  leadsThisWeek: number;
  quotesThisMonth: number;
  ordersThisMonth: number;
  customerStatusStats: { status: string; count: number }[];
  countryStats: { country: string; count: number }[];
  ownerStats: { ownerId: string; ownerName: string; count: number }[];
  quoteNoFollowUp3Days: { id: string; quoteNo: string; companyName: string; customerId: string }[];
  tasksOverdue: number;
  todayDueTasksCount: number;
}

export function ExportDashboardClient() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch("/api/export/dashboard");
        const json = await parseResponseJson<{ data?: DashboardData; error?: string }>(r);
        if (cancelled) return;
        if (json.data) setData(json.data);
        else setError(json.error ?? "加载失败");
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "加载失败");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) return <div className="rounded-lg border border-slate-200 bg-white p-12 text-center text-slate-500">加载中...</div>;
  if (error) return <div className="rounded-lg border border-red-200 bg-red-50 p-8 text-center text-red-600">{error}</div>;
  if (!data) return null;

  const hasAlerts =
    data.todayFollowUpCount > 0 ||
    data.overdueFollowUpCount > 0 ||
    data.quoteNoFollowUp3Days.length > 0 ||
    data.todayDueTasksCount > 0 ||
    data.tasksOverdue > 0;

  return (
    <div className="space-y-6">
      {/* 待办提醒区 */}
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="mb-4 font-medium text-slate-700">待办提醒</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Link
            href="/export/customers?filter=today"
            className="flex flex-col rounded-lg border border-slate-100 p-4 transition-colors hover:bg-slate-50"
          >
            <span className="text-sm text-slate-500">今日待跟进客户</span>
            <span className={`mt-1 text-2xl font-semibold ${data.todayFollowUpCount > 0 ? "text-teal-600" : "text-slate-400"}`}>
              {data.todayFollowUpCount}
            </span>
            <span className="mt-1 text-xs text-teal-600">查看 →</span>
          </Link>
          <Link
            href="/export/customers?filter=overdue"
            className="flex flex-col rounded-lg border border-slate-100 p-4 transition-colors hover:bg-slate-50"
          >
            <span className="text-sm text-slate-500">超7天未跟进</span>
            <span className={`mt-1 text-2xl font-semibold ${data.overdueFollowUpCount > 0 ? "text-amber-600" : "text-slate-400"}`}>
              {data.overdueFollowUpCount}
            </span>
            <span className="mt-1 text-xs text-teal-600">查看 →</span>
          </Link>
          <Link
            href="/export/tasks?due=today"
            className="flex flex-col rounded-lg border border-slate-100 p-4 transition-colors hover:bg-slate-50"
          >
            <span className="text-sm text-slate-500">今日到期任务</span>
            <span className={`mt-1 text-2xl font-semibold ${data.todayDueTasksCount > 0 ? "text-teal-600" : "text-slate-400"}`}>
              {data.todayDueTasksCount}
            </span>
            <span className="mt-1 text-xs text-teal-600">查看 →</span>
          </Link>
          <Link
            href="/export/tasks?status=overdue"
            className="flex flex-col rounded-lg border border-slate-100 p-4 transition-colors hover:bg-slate-50"
          >
            <span className="text-sm text-slate-500">超期任务</span>
            <span className={`mt-1 text-2xl font-semibold ${data.tasksOverdue > 0 ? "text-red-600" : "text-slate-400"}`}>
              {data.tasksOverdue}
            </span>
            <span className="mt-1 text-xs text-teal-600">查看 →</span>
          </Link>
          <div className="flex flex-col rounded-lg border border-slate-100 p-4">
            <span className="text-sm text-slate-500">报价3天未跟进</span>
            <span className={`mt-1 text-2xl font-semibold ${data.quoteNoFollowUp3Days.length > 0 ? "text-amber-600" : "text-slate-400"}`}>
              {data.quoteNoFollowUp3Days.length}
            </span>
            {data.quoteNoFollowUp3Days.length > 0 && (
              <span className="mt-1 text-xs text-teal-600">见下方列表</span>
            )}
          </div>
        </div>

        {data.quoteNoFollowUp3Days.length > 0 && (
          <div className="mt-4 border-t border-slate-100 pt-4">
            <h3 className="mb-2 text-sm font-medium text-amber-800">报价发出 3 天无跟进</h3>
            <ul className="space-y-1">
              {data.quoteNoFollowUp3Days.slice(0, 10).map((q) => (
                <li key={q.id}>
                  <Link
                    href={`/export/quotes/${q.id}`}
                    className="text-sm text-teal-600 hover:underline"
                  >
                    {q.quoteNo} - {q.companyName}
                  </Link>
                  <span className="mx-2 text-slate-400">|</span>
                  <Link
                    href={`/export/customers/${q.customerId}`}
                    className="text-sm text-slate-600 hover:underline"
                  >
                    客户
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* 数据概览 */}
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="mb-4 font-medium text-slate-700">数据概览</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <Link
            href="/export/leads?since=week&sortBy=createdAt&sortOrder=desc"
            className="flex flex-col rounded-lg border border-slate-100 p-4 transition-colors hover:bg-slate-50"
          >
            <span className="text-sm text-slate-500">本周新增 Leads</span>
            <span className="mt-1 text-2xl font-semibold text-slate-800">{data.leadsThisWeek}</span>
            <span className="mt-1 text-xs text-teal-600">查看 →</span>
          </Link>
          <Link
            href="/export/quotes?sortBy=quoteDate&sortOrder=desc"
            className="flex flex-col rounded-lg border border-slate-100 p-4 transition-colors hover:bg-slate-50"
          >
            <span className="text-sm text-slate-500">本月 Quotes</span>
            <span className="mt-1 text-2xl font-semibold text-slate-800">{data.quotesThisMonth}</span>
            <span className="mt-1 text-xs text-teal-600">查看 →</span>
          </Link>
          <Link
            href="/export/orders?sortBy=orderDate&sortOrder=desc"
            className="flex flex-col rounded-lg border border-slate-100 p-4 transition-colors hover:bg-slate-50"
          >
            <span className="text-sm text-slate-500">本月 Orders</span>
            <span className="mt-1 text-2xl font-semibold text-slate-800">{data.ordersThisMonth}</span>
            <span className="mt-1 text-xs text-teal-600">查看 →</span>
          </Link>
        </div>
      </div>

      {/* 统计 */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="mb-4 font-medium text-slate-700">客户状态分布</h2>
          <div className="space-y-2">
            {data.customerStatusStats.length === 0 ? (
              <p className="text-sm text-slate-500">暂无数据</p>
            ) : (
              data.customerStatusStats.map((s) => (
                <Link
                  key={s.status}
                  href={`/export/customers?status=${encodeURIComponent(s.status)}`}
                  className="flex items-center gap-2 rounded px-2 py-1 transition-colors hover:bg-slate-50"
                >
                  <span className="w-24 text-sm text-slate-600">{customerStatusLabel[s.status] ?? s.status}</span>
                  <span className="font-medium">{s.count}</span>
                  <span className="text-xs text-slate-400">→</span>
                </Link>
              ))
            )}
          </div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="mb-4 font-medium text-slate-700">国家分布</h2>
          <div className="space-y-2">
            {data.countryStats.length === 0 ? (
              <p className="text-sm text-slate-500">暂无数据</p>
            ) : (
              data.countryStats.map((s) => (
                <Link
                  key={s.country}
                  href={`/export/customers?country=${encodeURIComponent(s.country)}`}
                  className="flex items-center gap-2 rounded px-2 py-1 transition-colors hover:bg-slate-50"
                >
                  <span className="flex-1 text-sm text-slate-600">{s.country}</span>
                  <span className="font-medium">{s.count}</span>
                  <span className="text-xs text-slate-400">→</span>
                </Link>
              ))
            )}
          </div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="mb-4 font-medium text-slate-700">负责人客户数</h2>
          <div className="space-y-2">
            {data.ownerStats.length === 0 ? (
              <p className="text-sm text-slate-500">暂无数据</p>
            ) : (
              data.ownerStats
                .slice()
                .sort((a, b) => b.count - a.count)
                .map((item) => (
                  <Link
                    key={item.ownerId}
                    href={`/export/customers?ownerId=${encodeURIComponent(item.ownerId)}&sortBy=updatedAt&sortOrder=desc`}
                    className="flex items-center gap-2 rounded px-2 py-1 transition-colors hover:bg-slate-50"
                  >
                    <span className="flex-1 text-sm text-slate-600">{item.ownerName}</span>
                    <span className="font-medium">{item.count}</span>
                    <span className="text-xs text-slate-400">→</span>
                  </Link>
                ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
