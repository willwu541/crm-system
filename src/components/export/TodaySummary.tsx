"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { parseResponseJson } from "@/lib/parse-response-json";

type TodayAction = {
  id: string;
  at: string;
  text: string;
  href: string | null;
};

type TodayPerson = {
  userId: string;
  name: string;
  roleLabel: string;
  count: number;
  idle: boolean;
  actions: TodayAction[];
};

type TodayData = {
  dateLabel: string;
  people: TodayPerson[];
};

function timeLabel(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ""
    : new Intl.DateTimeFormat("zh-CN", { hour: "2-digit", minute: "2-digit" }).format(date);
}

export function TodaySummary() {
  const [data, setData] = useState<TodayData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    fetch("/api/export/today", { cache: "no-store" })
      .then((res) => parseResponseJson<{ data?: TodayData; error?: string }>(res).then((json) => ({ res, json })))
      .then(({ res, json }) => {
        if (!active) return;
        if (!res.ok || !json.data) {
          setError(json.error ?? "无权限");
          return;
        }
        setData(json.data);
      })
      .catch(() => {
        if (active) setError("加载失败");
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between gap-3">
        <h1 className="text-xl font-semibold text-slate-800">今日总结</h1>
        {data ? <p className="text-sm text-slate-500">{data.dateLabel}</p> : null}
      </div>

      {error ? (
        <div className="export-card border-red-200 bg-red-50 p-8 text-center text-red-600">{error}</div>
      ) : !data ? (
        <div className="export-card p-12 text-center text-slate-500">加载中...</div>
      ) : data.people.length === 0 ? (
        <div className="export-card p-8 text-center text-sm text-slate-500">今日暂无动作</div>
      ) : (
        <div className="space-y-3">
          {data.people.map((person) => (
            <section key={person.userId} className="export-card p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-slate-800">{person.name}</h2>
                  <p className="text-xs text-slate-500">{person.roleLabel}</p>
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                    person.count > 0 ? "bg-slate-100 text-slate-700" : "bg-slate-50 text-slate-400"
                  }`}
                >
                  {person.count}
                </span>
              </div>
              {person.idle ? (
                <p className="mt-2 text-sm text-slate-400">今日暂无动作</p>
              ) : (
                <ul className="mt-2 space-y-1">
                  {person.actions.map((action) => (
                    <li key={action.id} className="flex gap-3 text-sm">
                      <span className="w-12 shrink-0 text-slate-400">{timeLabel(action.at)}</span>
                      {action.href ? (
                        <Link href={action.href} className="text-slate-800 hover:underline">
                          {action.text}
                        </Link>
                      ) : (
                        <span className="text-slate-800">{action.text}</span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
