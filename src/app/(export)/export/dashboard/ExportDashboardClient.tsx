"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { parseResponseJson } from "@/lib/parse-response-json";
import { customerStatusLabel } from "@/lib/export-display-labels";
import { getUpcomingHolidays } from "@/lib/export/resources";

interface DashboardData {
  todayFollowUpCount: number;
  overdueFollowUpCount: number;
  leadsNeverCount: number;
  leadsDueCount: number;
  leadsStuckCount: number;
  leadsThisWeek: number;
  quotesThisMonth: number;
  ordersThisMonth: number;
  customerStatusStats: { status: string; count: number }[];
  countryStats: { country: string; count: number }[];
  ownerStats: { ownerId: string; ownerName: string; count: number }[];
  quoteNoFollowUp3Days: { id: string; quoteNo: string; companyName: string; customerId: string }[];
  tasksOverdue: number;
  todayDueTasksCount: number;
  whatsappMaintainCount: number;
  whatsappFirstContactCount: number;
}

interface TeamInsightRow {
  ownerId: string;
  ownerName: string;
  leadsDue: number;
  customersDue: number;
  tasksToday: number;
  tasksOverdue: number;
}

interface SourceRoiRow {
  source: string;
  totalLeads: number;
  validLeads: number;
  convertedLeads: number;
  validRate: number;
  conversionRate: number;
}

export function ExportDashboardClient() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [teamRows, setTeamRows] = useState<TeamInsightRow[]>([]);
  const [sourceRows, setSourceRows] = useState<SourceRoiRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [runningSop, setRunningSop] = useState(false);
  const [sopResult, setSopResult] = useState<string>("");
  const upcomingHolidays = getUpcomingHolidays(30);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [r, tr, sr] = await Promise.all([
          fetch("/api/export/dashboard"),
          fetch("/api/export/insights/team"),
          fetch("/api/export/insights/source-roi"),
        ]);
        const json = await parseResponseJson<{ data?: DashboardData; error?: string }>(r);
        const teamJson = await parseResponseJson<{ data?: TeamInsightRow[] }>(tr);
        const sourceJson = await parseResponseJson<{ data?: SourceRoiRow[] }>(sr);
        if (cancelled) return;
        if (json.data) setData(json.data);
        else setError(json.error ?? "加载失败");
        setTeamRows(teamJson.data ?? []);
        setSourceRows(sourceJson.data ?? []);
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

  if (loading) return <div className="export-card p-12 text-center text-slate-500">加载中...</div>;
  if (error) return <div className="export-card border-red-200 bg-red-50 p-8 text-center text-red-600">{error}</div>;
  if (!data) return null;

  async function runSop() {
    setRunningSop(true);
    setSopResult("");
    try {
      const r = await fetch("/api/export/sop/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dryRun: false, limit: 300 }),
      });
      const json = await parseResponseJson<{
        error?: string;
        data?: { createdCount: number; suggestCount: number; totalCandidates: number };
      }>(r);
      if (!r.ok) throw new Error(json.error ?? "执行失败");
      const d = json.data;
      setSopResult(
        d
          ? `SOP已运行：扫描 ${d.totalCandidates} 条线索，命中 ${d.suggestCount} 条，创建任务 ${d.createdCount} 条。`
          : "SOP 已运行",
      );
      // refresh dashboard numbers
      const refresh = await fetch("/api/export/dashboard");
      const refreshJson = await parseResponseJson<{ data?: DashboardData }>(refresh);
      if (refreshJson.data) setData(refreshJson.data);
    } catch (e) {
      setSopResult(e instanceof Error ? e.message : "SOP执行失败");
    } finally {
      setRunningSop(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* 线索开发待办 */}
      <div className="export-card bg-gradient-to-r from-blue-50 to-slate-50 p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-semibold text-slate-700">线索开发（今日优先）</h2>
          <button
            type="button"
            onClick={runSop}
            disabled={runningSop}
            className="export-btn-secondary rounded-md px-3 py-1.5 text-xs font-medium text-blue-700 disabled:opacity-50"
          >
            {runningSop ? "SOP执行中..." : "一键运行SOP自动任务"}
          </button>
        </div>
        {sopResult && (
          <div className="mb-3 rounded-md border border-teal-100 bg-white/70 px-3 py-2 text-xs text-slate-600">
            {sopResult}
          </div>
        )}
        <div className="grid gap-4 sm:grid-cols-3">
          <Link
            href="/export/leads?pace=never&sortBy=createdAt&sortOrder=desc"
            className="flex flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
          >
            <span className="text-sm text-slate-500">未联系过</span>
            <span
              className={`mt-1 text-2xl font-semibold ${data.leadsNeverCount > 0 ? "text-amber-600" : "text-slate-400"}`}
            >
              {data.leadsNeverCount}
            </span>
            <span className="export-soft-link mt-1 text-xs">去开发 →</span>
          </Link>
          <Link
            href="/export/leads?pace=due&sortBy=lastContactAt&sortOrder=asc"
            className="flex flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
          >
            <span className="text-sm text-slate-500">二次及以上联系</span>
            <span
              className={`mt-1 text-2xl font-semibold ${data.leadsDueCount > 0 ? "text-orange-600" : "text-slate-400"}`}
            >
              {data.leadsDueCount}
            </span>
            <span className="export-soft-link mt-1 text-xs">按最久未联系排序 →</span>
          </Link>
          <Link
            href="/export/leads?pace=stuck&sortBy=lastContactAt&sortOrder=asc"
            className="flex flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
          >
            <span className="text-sm text-slate-500">联系 3+ 无响应</span>
            <span
              className={`mt-1 text-2xl font-semibold ${data.leadsStuckCount > 0 ? "text-red-600" : "text-slate-400"}`}
            >
              {data.leadsStuckCount}
            </span>
            <span className="export-soft-link mt-1 text-xs">查看 →</span>
          </Link>
        </div>
      </div>

      {/* 待办提醒区 */}
      <div className="export-card p-4">
        <h2 className="mb-4 text-base font-semibold text-slate-700">客户 / 任务 / 报价</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <Link
            href="/export/customers?filter=today"
            className="flex flex-col rounded-lg border border-slate-100 p-4 transition-colors hover:bg-slate-50"
          >
            <span className="text-sm text-slate-500">待跟进客户（含逾期）</span>
            <span className={`mt-1 text-2xl font-semibold ${data.todayFollowUpCount > 0 ? "text-teal-600" : "text-slate-400"}`}>
              {data.todayFollowUpCount}
            </span>
            <span className="mt-1 text-xs text-sky-700">查看 →</span>
          </Link>
          <Link
            href="/export/customers?filter=overdue"
            className="flex flex-col rounded-lg border border-slate-100 p-4 transition-colors hover:bg-slate-50"
          >
            <span className="text-sm text-slate-500">超7天未跟进</span>
            <span className={`mt-1 text-2xl font-semibold ${data.overdueFollowUpCount > 0 ? "text-amber-600" : "text-slate-400"}`}>
              {data.overdueFollowUpCount}
            </span>
            <span className="mt-1 text-xs text-sky-700">查看 →</span>
          </Link>
          <Link
            href="/export/customers?filter=whatsapp_first&sortBy=createdAt&sortOrder=desc"
            className="flex flex-col rounded-lg border border-sky-100 bg-sky-50/40 p-4 transition-colors hover:bg-sky-50"
          >
            <span className="text-sm text-slate-600">WhatsApp 待联系</span>
            <span className={`mt-1 text-2xl font-semibold ${data.whatsappFirstContactCount > 0 ? "text-sky-700" : "text-slate-400"}`}>
              {data.whatsappFirstContactCount}
            </span>
            <span className="mt-1 text-xs text-sky-800">先联系上 →</span>
          </Link>
          <Link
            href="/export/customers?filter=whatsapp_maintain&sortBy=lastFollowUpAt&sortOrder=asc"
            className="flex flex-col rounded-lg border border-green-100 bg-green-50/40 p-4 transition-colors hover:bg-green-50"
          >
            <span className="text-sm text-slate-600">WhatsApp 待维护</span>
            <span className={`mt-1 text-2xl font-semibold ${data.whatsappMaintainCount > 0 ? "text-green-700" : "text-slate-400"}`}>
              {data.whatsappMaintainCount}
            </span>
            <span className="mt-1 text-xs text-green-800">已联系上，去维护 →</span>
          </Link>
          <Link
            href="/export/tasks?due=today"
            className="flex flex-col rounded-lg border border-slate-100 p-4 transition-colors hover:bg-slate-50"
          >
            <span className="text-sm text-slate-500">今日到期任务</span>
            <span className={`mt-1 text-2xl font-semibold ${data.todayDueTasksCount > 0 ? "text-teal-600" : "text-slate-400"}`}>
              {data.todayDueTasksCount}
            </span>
            <span className="mt-1 text-xs text-sky-700">查看 →</span>
          </Link>
          <Link
            href="/export/tasks?status=overdue"
            className="flex flex-col rounded-lg border border-slate-100 p-4 transition-colors hover:bg-slate-50"
          >
            <span className="text-sm text-slate-500">超期任务</span>
            <span className={`mt-1 text-2xl font-semibold ${data.tasksOverdue > 0 ? "text-red-600" : "text-slate-400"}`}>
              {data.tasksOverdue}
            </span>
            <span className="mt-1 text-xs text-sky-700">查看 →</span>
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
      <div className="export-card p-4">
        <h2 className="mb-4 text-base font-semibold text-slate-700">数据概览</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <Link
            href="/export/leads?since=week&sortBy=createdAt&sortOrder=desc"
            className="flex flex-col rounded-lg border border-slate-200 p-4 transition-colors hover:bg-sky-50/40"
          >
            <span className="text-sm text-slate-500">本周新增 Leads</span>
            <span className="mt-1 text-2xl font-semibold text-slate-800">{data.leadsThisWeek}</span>
            <span className="mt-1 text-xs text-sky-700">查看 →</span>
          </Link>
          <Link
            href="/export/quotes?since=month&sortBy=quoteDate&sortOrder=desc"
            className="flex flex-col rounded-lg border border-slate-200 p-4 transition-colors hover:bg-sky-50/40"
          >
            <span className="text-sm text-slate-500">本月 Quotes</span>
            <span className="mt-1 text-2xl font-semibold text-slate-800">{data.quotesThisMonth}</span>
            <span className="mt-1 text-xs text-sky-700">查看 →</span>
          </Link>
          <Link
            href="/export/orders?since=month&sortBy=orderDate&sortOrder=desc"
            className="flex flex-col rounded-lg border border-slate-200 p-4 transition-colors hover:bg-sky-50/40"
          >
            <span className="text-sm text-slate-500">本月 Orders</span>
            <span className="mt-1 text-2xl font-semibold text-slate-800">{data.ordersThisMonth}</span>
            <span className="mt-1 text-xs text-sky-700">查看 →</span>
          </Link>
        </div>
      </div>

      <div className="export-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-700">近期节日提醒（30天）</h2>
          <Link href="/export/resources" className="text-xs text-sky-700 hover:underline">
            打开资料库 →
          </Link>
        </div>
        {upcomingHolidays.length === 0 ? (
          <p className="text-sm text-slate-500">近期无节日提醒</p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {upcomingHolidays.slice(0, 6).map((h) => (
              <div key={`${h.monthDay}-${h.name}`} className="rounded-lg border border-slate-100 px-3 py-2">
                <p className="text-sm font-medium text-slate-800">{h.name}</p>
                <p className="text-xs text-slate-500">
                  {h.region} · {h.date} · {h.inDays === 0 ? "今天" : `${h.inDays} 天后`}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 统计 */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="export-card p-4">
          <h2 className="mb-4 text-base font-semibold text-slate-700">客户状态分布</h2>
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
        <div className="export-card p-4">
          <h2 className="mb-4 text-base font-semibold text-slate-700">国家分布</h2>
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
        <div className="export-card p-4">
          <h2 className="mb-4 text-base font-semibold text-slate-700">负责人客户数</h2>
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

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="export-card p-4">
          <h2 className="mb-3 text-base font-semibold text-slate-700">团队执行看板</h2>
          {teamRows.length === 0 ? (
            <p className="text-sm text-slate-500">暂无数据</p>
          ) : (
            <div className="space-y-2">
              {teamRows.map((r) => (
                <div key={r.ownerId} className="rounded-lg border border-slate-100 px-3 py-2 text-sm">
                  <p className="font-medium text-slate-800">{r.ownerName}</p>
                  <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-600">
                    <Link href={`/export/leads?ownerId=${r.ownerId}&pace=due`} className="hover:text-teal-700 hover:underline">
                      线索待跟进 {r.leadsDue}
                    </Link>
                    <Link href={`/export/customers?ownerId=${r.ownerId}&filter=overdue`} className="hover:text-teal-700 hover:underline">
                      客户待跟进 {r.customersDue}
                    </Link>
                    <Link href={`/export/tasks?ownerId=${r.ownerId}&due=today`} className="hover:text-teal-700 hover:underline">
                      今日任务 {r.tasksToday}
                    </Link>
                    <Link href={`/export/tasks?ownerId=${r.ownerId}&status=overdue`} className="hover:text-teal-700 hover:underline">
                      超期任务 {r.tasksOverdue}
                    </Link>
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="export-card p-4">
          <h2 className="mb-3 text-base font-semibold text-slate-700">获客渠道 ROI（线索转化）</h2>
          {sourceRows.length === 0 ? (
            <p className="text-sm text-slate-500">暂无数据</p>
          ) : (
            <div className="space-y-2">
              {sourceRows.slice(0, 10).map((r) => (
                <Link
                  key={r.source}
                  href={`/export/leads?sourceChannel=${encodeURIComponent(r.source === "未标注来源" ? "__empty__" : r.source)}`}
                  className="block rounded-lg border border-slate-100 px-3 py-2 text-sm transition-colors hover:bg-slate-50"
                >
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-slate-800">{r.source}</p>
                    <span className="text-xs text-teal-700">转化率 {r.conversionRate}%</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-600">
                    线索 {r.totalLeads} · 有效 {r.validLeads} ({r.validRate}%) · 已转化 {r.convertedLeads}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
