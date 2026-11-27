"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type VisitPage = { path: string; at: string };

type Visit = {
  id: string;
  started_at: string;
  updated_at: string;
  source: string;
  landing_path: string;
  referrer: string;
  country: string;
  region: string;
  device: string;
  os: string;
  browser: string;
  language: string;
  gclid: string;
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  utm_term: string;
  utm_content: string;
  pages: VisitPage[];
  page_count?: number;
  engaged_seconds?: number;
  returning?: boolean;
  events?: string[];
  interests?: string[];
  intent?: string;
  exit_path?: string;
  unique_pages?: number;
  span_seconds?: number;
  bounce?: boolean;
  scroll_pct?: number;
  width?: number;
  height?: number;
  locale?: string;
  referrer_host?: string;
  products?: string[];
  industries?: string[];
  shanghai_hour?: string;
  shanghai_weekday?: string;
  visitor_hour?: string;
};

const INTENT_LABEL: Record<string, string> = {
  high: "高意向",
  medium: "有兴趣",
  low: "只是路过",
};

const EVENT_LABEL: Record<string, string> = {
  rfq: "打开或提交询盘",
  whatsapp: "点击 WhatsApp",
  email: "点击邮箱",
  phone: "点击电话",
  download: "下载资料",
};

const SOURCE_LABEL: Record<string, string> = {
  "Google Ads": "谷歌广告",
  "Google search": "谷歌搜索",
  "Other search": "其他搜索",
  Direct: "直接访问",
  "Paid ads": "付费广告",
};

function sourceLabel(value: string) {
  return SOURCE_LABEL[value] || value || "未知";
}

function intentLabel(value?: string) {
  return INTENT_LABEL[value || ""] || "只是路过";
}

function durationLabel(seconds?: number) {
  const total = Math.max(0, seconds || 0);
  if (total < 60) return `${total} 秒`;
  return `${Math.floor(total / 60)} 分 ${total % 60} 秒`;
}

function timeLabel(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ""
    : new Intl.DateTimeFormat("zh-CN", {
        month: "numeric",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(date);
}

function shanghaiDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function shiftDate(iso: string, days: number) {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(year, (month || 1) - 1, day || 1));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function topCounts(visits: Visit[], pick: (visit: Visit) => string, limit = 5) {
  const counts = new Map<string, number>();
  for (const visit of visits) {
    const key = pick(visit).trim() || "未记录";
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit);
}

export function WebsiteVisitsClient() {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [source, setSource] = useState("all");
  const [intent, setIntent] = useState("all");
  const [day, setDay] = useState(() => shanghaiDate(new Date().toISOString()));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/export/website-visits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "list" }),
        cache: "no-store",
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data.ok === false) {
        throw new Error(data.message || "读取失败，请稍后重试。");
      }
      const items = Array.isArray(data.visits) ? (data.visits as Visit[]) : [];
      setVisits(items);
      setError("");
      setSelectedId((current) => current || items[0]?.id || "");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "读取失败，请稍后重试。");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 60000);
    return () => window.clearInterval(timer);
  }, [load]);

  const dayCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const visit of visits) {
      const key = shanghaiDate(visit.started_at);
      if (key) counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [visits]);
  const dayVisits = useMemo(
    () => visits.filter((visit) => shanghaiDate(visit.started_at) === day),
    [visits, day],
  );
  const sources = useMemo(
    () => [...new Set(dayVisits.map((visit) => visit.source || "未记录"))],
    [dayVisits],
  );
  const visible = dayVisits.filter((visit) => {
    if (source !== "all" && (visit.source || "未记录") !== source) return false;
    if (intent !== "all" && (visit.intent || "low") !== intent) return false;
    return true;
  });
  const highIntent = dayVisits.filter((visit) => visit.intent === "high").length;
  const returningCount = dayVisits.filter((visit) => visit.returning).length;
  const selected = visible.find((visit) => visit.id === selectedId) ?? visible[0] ?? null;
  const countries = topCounts(dayVisits, (visit) => [visit.country, visit.region].filter(Boolean).join(" "));
  const devices = topCounts(dayVisits, (visit) => visit.device);
  const pages = topCounts(dayVisits, (visit) => visit.landing_path);
  const adVisits = dayVisits.filter((visit) => visit.source === "Google Ads" || visit.gclid).length;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">网站访客</h1>
          <p className="text-sm text-slate-500">按上海日期查看每一天。统计和列表都只含所选这一天，最多回溯 90 天里的 200 次访问。</p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
        >
          刷新
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => setDay((current) => shiftDate(current, -1))} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50">前一天</button>
        <input type="date" value={day} max={shanghaiDate(new Date().toISOString())} onChange={(event) => event.target.value && setDay(event.target.value)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm" />
        <button type="button" onClick={() => setDay((current) => shiftDate(current, 1))} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50">后一天</button>
        <button type="button" onClick={() => setDay(shanghaiDate(new Date().toISOString()))} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50">今天</button>
        <div className="flex gap-1 overflow-auto">
          {dayCounts.slice(0, 14).map(([date, count]) => (
            <button key={date} type="button" onClick={() => setDay(date)} className={`shrink-0 rounded-full px-2.5 py-1 text-xs ${date === day ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"}`}>
              {date.slice(5)} · {count}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <Stat label="当天访问" value={String(dayVisits.length)} />
        <Stat label="高意向" value={String(highIntent)} />
        <Stat label="回头访问" value={String(returningCount)} />
        <Stat label="谷歌广告" value={String(adVisits)} />
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <Rank title="来源" rows={topCounts(dayVisits, (visit) => sourceLabel(visit.source))} />
        <Rank title="地区" rows={countries} />
        <Rank title="落地页" rows={pages} />
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        <Rank title="设备" rows={devices} />
        <Rank title="看过的栏目" rows={topCounts(dayVisits, (visit) => (visit.interests || []).join("、") || "未深入浏览")} />
        <Rank title="产品" rows={topCounts(dayVisits, (visit) => (visit.products || []).join("、") || "未看产品")} />
        <Rank title="行业页" rows={topCounts(dayVisits, (visit) => (visit.industries || []).join("、") || "未看行业页")} />
        <Rank title="上海时段" rows={topCounts(dayVisits, (visit) => visit.shanghai_hour !== undefined && visit.shanghai_hour !== "" ? `${visit.shanghai_hour} 点` : "未知")} />
        <Rank title="站点语言" rows={topCounts(dayVisits, (visit) => visit.locale || "en")} />
      </div>

      {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}

      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)]">
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2">
            <h2 className="text-sm font-semibold text-slate-800">访问列表</h2>
            <span className="flex gap-2">
              <select
                value={intent}
                onChange={(event) => setIntent(event.target.value)}
                className="rounded-md border border-slate-200 px-2 py-1 text-sm"
              >
                <option value="all">全部意向</option>
                <option value="high">高意向</option>
                <option value="medium">有兴趣</option>
                <option value="low">只是路过</option>
              </select>
              <select
                value={source}
                onChange={(event) => setSource(event.target.value)}
                className="rounded-md border border-slate-200 px-2 py-1 text-sm"
              >
                <option value="all">全部来源</option>
                {sources.map((item) => (
                  <option key={item} value={item}>{sourceLabel(item)}</option>
                ))}
              </select>
            </span>
          </div>
          {loading ? (
            <p className="p-8 text-center text-sm text-slate-500">正在读取网站访客…</p>
          ) : visible.length === 0 ? (
            <p className="p-8 text-center text-sm text-slate-500">{day} 没有访客记录。</p>
          ) : (
            <ul className="max-h-[32rem] divide-y divide-slate-100 overflow-auto">
              {visible.map((visit) => (
                <li key={visit.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(visit.id)}
                    className={`block w-full px-3 py-2 text-left hover:bg-slate-50 ${
                      selected?.id === visit.id ? "bg-blue-50" : ""
                    }`}
                  >
                    <span className="flex items-center justify-between gap-3 text-sm">
                      <span className="font-medium text-slate-900">
                        {intentLabel(visit.intent)} · {sourceLabel(visit.source)}
                        {visit.returning ? " · 回头" : ""}
                      </span>
                      <span className="shrink-0 text-slate-500">{timeLabel(visit.updated_at)}</span>
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-slate-500">
                      {[visit.country, visit.region].filter(Boolean).join(" ") || "地区未知"}
                      {" · "}
                      {visit.device || "设备未知"}
                      {" · "}
                      {visit.page_count || visit.pages?.length || 0} 页 · {durationLabel(visit.engaged_seconds)} · {visit.landing_path || "落地页未知"}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-4">
          {selected ? (
            <dl className="space-y-3">
              <Field label="意向" value={intentLabel(selected.intent)} />
              <Field label="停留" value={durationLabel(selected.engaged_seconds)} />
              <Field label="访问类型" value={selected.returning ? "回头访问" : "第一次访问"} />
              <Field label="看过的栏目" value={(selected.interests || []).join("、")} />
              <Field label="主动动作" value={(selected.events || []).map((item) => EVENT_LABEL[item] || item).join("、")} />
              <Field label="来源" value={sourceLabel(selected.source)} />
              <Field label="离开页面" value={selected.exit_path} />
              <Field label="浏览页数" value={`${selected.page_count || 0} 次 / ${selected.unique_pages || 0} 个不同页面`} />
              <Field label="在站时长" value={durationLabel(selected.span_seconds)} />
              <Field label="是否跳出" value={selected.bounce ? "是，只看了一眼" : "否"} />
              <Field label="滚动深度" value={selected.scroll_pct ? `${selected.scroll_pct}%` : ""} />
              <Field label="屏幕" value={selected.width ? `${selected.width}×${selected.height || 0}` : ""} />
              <Field label="站点语言" value={selected.locale} />
              <Field label="来源网站" value={selected.referrer_host} />
              <Field label="看过的产品" value={(selected.products || []).join("、")} />
              <Field label="看过的行业" value={(selected.industries || []).join("、")} />
              <Field label="上海时间" value={selected.shanghai_weekday && selected.shanghai_hour !== undefined && selected.shanghai_hour !== "" ? `${selected.shanghai_weekday} ${selected.shanghai_hour} 点` : ""} />
              <Field label="访客当地时间" value={selected.visitor_hour !== undefined && selected.visitor_hour !== "" ? `${selected.visitor_hour} 点` : ""} />
              <Field label="地区" value={[selected.country, selected.region].filter(Boolean).join(" ")} />
              <Field label="设备" value={[selected.device, selected.os, selected.browser].filter(Boolean).join(" · ")} />
              <Field label="语言" value={selected.language} />
              <Field label="落地页" value={selected.landing_path} />
              <Field label="来源网址" value={selected.referrer} />
              <Field label="广告系列" value={selected.utm_campaign} />
              <Field label="关键词" value={selected.utm_term} />
              <Field label="广告内容" value={selected.utm_content} />
              <Field label="谷歌点击 ID" value={selected.gclid} />
              <div>
                <dt className="text-xs text-slate-500">浏览页面</dt>
                <dd className="mt-1 space-y-1">
                  {selected.pages.length === 0 ? (
                    <p className="text-sm text-slate-500">没有页面记录。</p>
                  ) : (
                    selected.pages.map((page, index) => (
                      <p key={`${page.path}-${index}`} className="text-sm text-slate-800">
                        {page.path}
                        <span className="ml-2 text-xs text-slate-400">{timeLabel(page.at)}</span>
                      </p>
                    ))
                  )}
                </dd>
              </div>
            </dl>
          ) : (
            <p className="text-sm text-slate-500">选择一条访问查看路径和广告信息。</p>
          )}
        </section>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function Rank({ title, rows }: { title: string; rows: Array<[string, number]> }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
      <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
      {rows.length === 0 ? (
        <p className="mt-2 text-sm text-slate-500">暂无数据</p>
      ) : (
        <ul className="mt-2 space-y-1">
          {rows.map(([label, count]) => (
            <li key={label} className="flex justify-between gap-3 text-sm">
              <span className="truncate text-slate-700">{label}</span>
              <span className="text-slate-500">{count}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value?: string }) {
  if (!value?.trim()) return null;
  return (
    <div>
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="mt-0.5 break-all text-sm text-slate-800">{value}</dd>
    </div>
  );
}
