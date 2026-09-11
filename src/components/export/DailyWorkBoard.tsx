"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { parseResponseJson } from "@/lib/parse-response-json";
import { activityOutcomeLabel } from "@/lib/export-display-labels";

type MetricRow = {
  ownerId: string;
  ownerName: string;
  fitConfirmed: number;
  namedContacts: number;
  realReplies: number;
  gotSpecs: number;
  nextAgreed: number;
  logged: number;
};

type MustPush = {
  kind: string;
  id: string;
  href: string;
  companyName: string;
  country: string;
  ownerName: string;
  reason: string;
};

type FeedItem = {
  id: string;
  ownerName: string;
  companyName: string;
  href: string;
  outcome: string | null;
  note: string | null;
  createdAt: string;
};

type DailyData = {
  isAdmin: boolean;
  viewerId: string;
  metrics: MetricRow[];
  mustPush: MustPush[];
  feed: FeedItem[];
};

function timeLabel(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ""
    : new Intl.DateTimeFormat("zh-CN", { hour: "2-digit", minute: "2-digit" }).format(date);
}

export function DailyWorkBoard() {
  const [data, setData] = useState<DailyData | null>(null);
  const [error, setError] = useState("");

  async function load(silent = false) {
    try {
      const res = await fetch("/api/export/daily", { cache: "no-store" });
      const json = await parseResponseJson<{ data?: DailyData; error?: string }>(res);
      if (!res.ok) throw new Error(json.error ?? "加载失败");
      if (json.data) {
        setData(json.data);
        setError("");
      }
    } catch (cause) {
      if (!silent) setError(cause instanceof Error ? cause.message : "加载失败");
    }
  }

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(true), 20000);
    return () => window.clearInterval(timer);
  }, []);

  if (error && !data) {
    return <div className="export-card border-red-200 bg-red-50 p-3 text-sm text-red-600">{error}</div>;
  }
  if (!data) return null;

  const mine = data.metrics.find((row) => row.ownerId === data.viewerId) ?? data.metrics[0];
  const scoreCards = mine
    ? [
        { label: "确认采购", value: mine.fitConfirmed },
        { label: "找到人", value: mine.namedContacts },
        { label: "真实回应", value: mine.realReplies },
        { label: "拿到资料", value: mine.gotSpecs },
        { label: "下一步", value: mine.nextAgreed },
      ]
    : [];

  return (
    <div className="space-y-3">
      <div className="export-card p-4">
        <div className="grid grid-cols-5 gap-2">
          {scoreCards.map((card) => (
            <div key={card.label} className="rounded-lg bg-slate-50 px-2 py-2 text-center">
              <p className={`text-xl font-semibold ${card.value > 0 ? "text-teal-700" : "text-slate-400"}`}>
                {card.value}
              </p>
              <p className="mt-0.5 text-[11px] text-slate-500">{card.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <div className="export-card p-3">
          <h3 className="mb-2 text-sm font-semibold text-slate-800">今天要跟</h3>
          {data.mustPush.length === 0 ? (
            <p className="text-xs text-slate-400">今天没有到期跟进</p>
          ) : (
            <div className="space-y-1">
              {data.mustPush.map((item) => (
                <Link
                  key={`${item.kind}-${item.id}`}
                  href={item.href}
                  className="flex items-center justify-between gap-2 rounded px-2 py-1.5 text-sm hover:bg-slate-50"
                >
                  <span className="truncate font-medium text-slate-800">{item.companyName}</span>
                  <span className="shrink-0 text-[11px] text-amber-700">{item.reason}</span>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="export-card p-3">
          <h3 className="mb-2 text-sm font-semibold text-slate-800">刚写下的结果</h3>
          {data.feed.length === 0 ? (
            <p className="text-xs text-slate-400">今天还没有记录</p>
          ) : (
            <div className="space-y-1">
              {data.feed.map((item) => (
                <Link key={item.id} href={item.href} className="block rounded px-2 py-1.5 hover:bg-slate-50">
                  <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500">
                    <span className="truncate">
                      {item.ownerName}
                      {item.outcome ? ` · ${activityOutcomeLabel[item.outcome] ?? item.outcome}` : ""}
                    </span>
                    <span>{timeLabel(item.createdAt)}</span>
                  </div>
                  <p className="truncate text-sm text-slate-800">{item.companyName}</p>
                  {item.note ? <p className="truncate text-xs text-slate-500">{item.note}</p> : null}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {data.isAdmin && data.metrics.length > 0 && (
        <div className="export-card overflow-x-auto p-3">
          <table className="min-w-full text-left text-sm">
            <thead className="text-[11px] text-slate-500">
              <tr>
                <th className="px-2 py-1.5">业务员</th>
                <th className="px-2 py-1.5">采购</th>
                <th className="px-2 py-1.5">找人</th>
                <th className="px-2 py-1.5">回应</th>
                <th className="px-2 py-1.5">资料</th>
                <th className="px-2 py-1.5">下一步</th>
                <th className="px-2 py-1.5">条数</th>
              </tr>
            </thead>
            <tbody>
              {data.metrics.map((row) => (
                <tr key={row.ownerId} className="border-t border-slate-100">
                  <td className="px-2 py-1.5 font-medium text-slate-800">{row.ownerName}</td>
                  <td className="px-2 py-1.5">{row.fitConfirmed}</td>
                  <td className="px-2 py-1.5">{row.namedContacts}</td>
                  <td className="px-2 py-1.5">{row.realReplies}</td>
                  <td className="px-2 py-1.5">{row.gotSpecs}</td>
                  <td className="px-2 py-1.5">{row.nextAgreed}</td>
                  <td className="px-2 py-1.5 text-slate-500">{row.logged}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
