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

type SummaryDay = {
  date: string;
  label: string;
  isToday: boolean;
};

type TodayData = {
  date: string;
  dateLabel: string;
  isToday: boolean;
  today: string;
  days: SummaryDay[];
  people: TodayPerson[];
};

function timeLabel(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ""
    : new Intl.DateTimeFormat("zh-CN", { hour: "2-digit", minute: "2-digit" }).format(date);
}

export function TodaySummary() {
  const [requestedDate, setRequestedDate] = useState<string | null>(null);
  const [data, setData] = useState<TodayData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const query = requestedDate ? `?date=${encodeURIComponent(requestedDate)}` : "";
    fetch(`/api/export/today${query}`, { cache: "no-store" })
      .then((res) => parseResponseJson<{ data?: TodayData; error?: string }>(res).then((json) => ({ res, json })))
      .then(({ res, json }) => {
        if (!active) return;
        if (!res.ok || !json.data) {
          setError(json.error ?? "无权限");
          return;
        }
        setError("");
        setData(json.data);
      })
      .catch(() => {
        if (active) setError("加载失败");
      });
    return () => {
      active = false;
    };
  }, [requestedDate]);

  const selectedDate = requestedDate ?? data?.date ?? "";
  const viewingToday = data ? selectedDate === data.today : true;
  const idleText = viewingToday ? "今日暂无动作" : "当日暂无动作";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">每日总结</h1>
          <p className="mt-1 text-sm text-slate-500">按天查看每个人做了什么</p>
        </div>
        {data ? (
          <label className="text-sm text-slate-500">
            日期
            <input
              type="date"
              max={data.today}
              value={selectedDate}
              onChange={(event) => setRequestedDate(event.target.value || data.today)}
              className="ml-2 rounded-md border border-slate-200 bg-white px-2 py-1 text-sm text-slate-800"
            />
          </label>
        ) : null}
      </div>

      {data ? (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {data.days.map((day) => {
            const selected = day.date === selectedDate;
            return (
              <button
                key={day.date}
                type="button"
                onClick={() => setRequestedDate(day.date)}
                className={`shrink-0 rounded-full px-3 py-1 text-sm ${
                  selected ? "bg-slate-800 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
                }`}
              >
                {day.label}
              </button>
            );
          })}
        </div>
      ) : null}

      {data ? <p className="text-sm text-slate-500">{data.dateLabel}</p> : null}

      {error ? (
        <div className="export-card border-red-200 bg-red-50 p-8 text-center text-red-600">{error}</div>
      ) : !data ? (
        <div className="export-card p-12 text-center text-slate-500">加载中...</div>
      ) : data.people.length === 0 ? (
        <div className="export-card p-8 text-center text-sm text-slate-500">{idleText}</div>
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
                <p className="mt-2 text-sm text-slate-400">{idleText}</p>
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
