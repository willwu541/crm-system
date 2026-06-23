"use client";

import {
  AI_LINKS,
  AI_PROMPTS,
  CHANNEL_PLAYBOOK,
  GRATING_SPECS,
  MARKET_HOLIDAYS,
  USEFUL_LINKS,
  getUpcomingHolidays,
} from "@/lib/export/resources";

export function ResourcesClient() {
  const upcoming = getUpcomingHolidays(60);

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm">
        <h1 className="text-lg font-semibold text-slate-800">资料库 / 速查</h1>
        <p className="text-xs text-slate-500">
          钢格板外贸常用：节日日历、常用规格、网站导航、社媒话术。纯参考，不影响业务数据。
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* 即将到来的节日 */}
        <div className="rounded-xl border border-teal-100 bg-gradient-to-r from-teal-50/70 to-cyan-50/60 p-4 shadow-sm">
          <h2 className="mb-3 text-base font-semibold text-slate-700">近 60 天市场节日（把握问候/促单时机）</h2>
          {upcoming.length === 0 ? (
            <p className="text-sm text-slate-500">近期无重要节日</p>
          ) : (
            <ul className="space-y-2">
              {upcoming.map((h) => (
                <li
                  key={`${h.monthDay}-${h.name}`}
                  className="flex items-center justify-between rounded-lg border border-white bg-white/80 px-3 py-2 text-sm"
                >
                  <div>
                    <span className="font-medium text-slate-800">{h.name}</span>
                    <span className="ml-2 text-xs text-slate-500">{h.region}</span>
                    {h.note && <span className="ml-2 text-xs text-amber-600">{h.note}</span>}
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-slate-500">{h.date}</div>
                    <div className="text-xs font-medium text-teal-700">
                      {h.inDays === 0 ? "今天" : `${h.inDays} 天后`}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* 全年节日 */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-base font-semibold text-slate-700">全年节日速览</h2>
          <ul className="grid grid-cols-1 gap-1 sm:grid-cols-2">
            {MARKET_HOLIDAYS.map((h) => (
              <li key={`${h.monthDay}-${h.name}`} className="text-sm text-slate-600">
                <span className="text-slate-400">{h.monthDay}</span>{" "}
                <span className="text-slate-800">{h.name}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* 常用规格 */}
      <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-base font-semibold text-slate-700">钢格板常用规格速查</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {GRATING_SPECS.map((g) => (
            <div key={g.group} className="rounded-lg border border-slate-100 p-3">
              <p className="mb-2 text-sm font-medium text-slate-700">{g.group}</p>
              <ul className="space-y-1">
                {g.items.map((it) => (
                  <li key={it.label} className="text-xs text-slate-600">
                    <span className="text-slate-400">{it.label}：</span>
                    {it.value}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* 常用网站 */}
      <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-base font-semibold text-slate-700">常用网站导航</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {USEFUL_LINKS.map((g) => (
            <div key={g.group} className="rounded-lg border border-slate-100 p-3">
              <p className="mb-2 text-sm font-medium text-slate-700">{g.group}</p>
              <ul className="space-y-1.5">
                {g.links.map((l) => (
                  <li key={l.name} className="text-sm">
                    <a
                      href={l.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-teal-700 hover:underline"
                    >
                      {l.name}
                    </a>
                    {l.note && <span className="ml-1 text-xs text-slate-400">{l.note}</span>}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* AI 入口 */}
      <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-base font-semibold text-slate-700">AI 问询快捷入口（点击即用）</h2>
        <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {AI_LINKS.map((a) => (
            <a
              key={a.name}
              href={a.url}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50"
            >
              <p className="font-medium text-teal-700">{a.name}</p>
              {a.note && <p className="text-xs text-slate-500">{a.note}</p>}
            </a>
          ))}
        </div>
        <h3 className="mb-2 text-sm font-medium text-slate-700">常用提问模板（复制到任意 AI）</h3>
        <div className="space-y-2">
          {AI_PROMPTS.map((p) => (
            <div key={p.title} className="rounded-lg border border-slate-100 p-3">
              <p className="mb-1 text-sm font-medium text-slate-700">{p.title}</p>
              <pre className="whitespace-pre-wrap break-words text-xs text-slate-600">{p.prompt}</pre>
            </div>
          ))}
        </div>
      </div>

      {/* 社媒话术 */}
      <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-base font-semibold text-slate-700">社媒 / 获客渠道速记</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {CHANNEL_PLAYBOOK.map((c) => (
            <div key={c.channel} className="rounded-lg border border-slate-100 p-3">
              <p className="mb-1 text-sm font-medium text-slate-700">{c.channel}</p>
              <p className="text-xs leading-relaxed text-slate-600">{c.tip}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
