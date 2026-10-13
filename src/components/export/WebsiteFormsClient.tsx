"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { parseResponseJson } from "@/lib/parse-response-json";
import { DuplicateErrorAlert, type DuplicateRecord } from "./DuplicateErrorAlert";

type FormSummary = {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  country: string;
  request_type: string;
  message: string;
  status: "open" | "closed";
  created_at: string;
  unread: number;
};

type FormDetail = FormSummary & {
  selected_product?: string;
  application?: string;
  required_by?: string;
  quantity?: string;
  services?: string[];
  attachments?: string[];
  page?: string;
  utm?: Record<string, string>;
  updated_at?: string;
};

async function formsApi<T>(action: string, payload: Record<string, unknown> = {}): Promise<T> {
  const response = await fetch("/api/export/website-forms", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...payload }),
    cache: "no-store",
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.ok === false) {
    throw new Error(data.message || "操作失败，请稍后重试。");
  }
  return data as T;
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

function Field({ label, value }: { label: string; value?: string | string[] | null }) {
  const text = Array.isArray(value) ? value.filter(Boolean).join("、") : value?.trim();
  if (!text) return null;
  return (
    <div>
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="mt-0.5 whitespace-pre-wrap text-sm text-slate-800">{text}</dd>
    </div>
  );
}

export function WebsiteFormsClient() {
  const router = useRouter();
  const [items, setItems] = useState<FormSummary[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [detail, setDetail] = useState<FormDetail | null>(null);
  const [filter, setFilter] = useState<"open" | "all">("open");
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(true);
  const [converting, setConverting] = useState(false);
  const [error, setError] = useState("");
  const [duplicate, setDuplicate] = useState<DuplicateRecord | null>(null);

  const loadList = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const data = await formsApi<{ forms: FormSummary[] }>("list");
      setItems(data.forms ?? []);
      setError("");
    } catch (cause) {
      if (!quiet) setError(cause instanceof Error ? cause.message : "加载失败。");
    } finally {
      if (!quiet) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadList();
    const timer = window.setInterval(() => void loadList(true), 5000);
    return () => window.clearInterval(timer);
  }, [loadList]);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const data = await formsApi<{ form: FormDetail }>("get", { id: selectedId });
        if (!cancelled) {
          setDetail(data.form);
          setItems((rows) =>
            rows.map((row) => (row.id === selectedId ? { ...row, unread: 0 } : row)),
          );
        }
      } catch (cause) {
        if (!cancelled) setError(cause instanceof Error ? cause.message : "加载详情失败。");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  const visibleItems = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    return items.filter((item) => {
      if (filter === "open" && item.status !== "open") return false;
      if (!q) return true;
      return [item.name, item.email, item.company, item.phone, item.country, item.message, item.request_type]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [items, filter, keyword]);

  const unread = items.reduce((total, item) => total + Number(item.unread || 0), 0);

  async function setStatus(status: "open" | "closed") {
    if (!detail) return;
    try {
      const data = await formsApi<{ form: FormDetail }>("status", { id: detail.id, status });
      setDetail(data.form);
      setItems((rows) =>
        rows.map((row) => (row.id === detail.id ? { ...row, status: data.form.status, unread: 0 } : row)),
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "更新状态失败。");
    }
  }

  async function convertToLead() {
    if (!detail) return;
    setConverting(true);
    setDuplicate(null);
    setError("");
    try {
      const notes = [
        detail.message,
        detail.request_type ? `产品：${detail.request_type}` : "",
        detail.selected_product ? `系统：${detail.selected_product}` : "",
        detail.application ? `用途：${detail.application}` : "",
        detail.quantity ? `数量：${detail.quantity}` : "",
        detail.required_by ? `要货时间：${detail.required_by}` : "",
        detail.page ? `来源页：${detail.page}` : "",
      ]
        .filter(Boolean)
        .join("\n");
      const res = await fetch("/api/export/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: detail.company.trim() || detail.name.trim() || "Website RFQ",
          country: detail.country || undefined,
          email: detail.email || undefined,
          phone: detail.phone || undefined,
          whatsapp: detail.phone || undefined,
          sourceChannel: "Website Inquiry",
          productInterest: detail.request_type || detail.selected_product || undefined,
          notes,
        }),
      });
      const json = await parseResponseJson<{
        data?: { id: string };
        error?: string;
        duplicate?: DuplicateRecord;
      }>(res);
      if (!res.ok) {
        if (json.duplicate) setDuplicate(json.duplicate);
        throw new Error(json.error ?? "转入线索失败");
      }
      await setStatus("closed");
      if (json.data?.id) router.push(`/export/leads/${json.data.id}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "转入线索失败。");
    } finally {
      setConverting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200/80 bg-white px-5 py-4 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold text-slate-900">官网表单</h1>
            {unread > 0 && (
              <span className="rounded-full bg-rose-500 px-2 py-0.5 text-xs font-semibold text-white">
                {unread} 条未读
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-slate-500">
            访客在 wibergmetal.com 提交询价表后会出现在这里，和实时聊天分开。
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}
      {duplicate && <DuplicateErrorAlert error="系统里已有相同客户或线索。" duplicate={duplicate} />}

      <div className="grid min-h-[660px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm lg:grid-cols-[340px_1fr]">
        <aside className="border-b border-slate-200 bg-slate-50/70 lg:border-b-0 lg:border-r">
          <div className="space-y-3 border-b border-slate-200 p-4">
            <input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="搜索公司、邮箱、留言"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
            />
            <div className="grid grid-cols-2 rounded-lg bg-slate-200/70 p-1 text-sm">
              {(["open", "all"] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setFilter(value)}
                  className={`rounded-md px-3 py-1.5 ${filter === value ? "bg-white font-medium text-slate-900 shadow-sm" : "text-slate-500"}`}
                >
                  {value === "open" ? "未处理" : "全部"}
                </button>
              ))}
            </div>
          </div>
          <div className="max-h-[565px] space-y-2 overflow-y-auto p-3">
            {loading ? (
              <p className="p-8 text-center text-sm text-slate-500">正在读取官网表单…</p>
            ) : visibleItems.length === 0 ? (
              <p className="p-8 text-center text-sm text-slate-500">还没有表单询盘。</p>
            ) : (
              visibleItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedId(item.id)}
                  className={`w-full rounded-xl border p-4 text-left shadow-sm transition hover:bg-white ${
                    selectedId === item.id
                      ? "border-blue-300 bg-blue-50 ring-1 ring-blue-200"
                      : "border-slate-200 bg-white/70"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <strong className="truncate text-sm text-slate-900">
                      {item.company || item.name || "网站访客"}
                    </strong>
                    <span className="shrink-0 text-[11px] text-slate-400">{timeLabel(item.created_at)}</span>
                  </div>
                  <p className="mt-1 truncate text-xs text-slate-500">
                    {[item.email, item.country, item.request_type].filter(Boolean).join(" · ") || "官网询价"}
                  </p>
                  <div className="mt-1 flex items-center gap-2">
                    <p className="min-w-0 flex-1 truncate text-xs text-slate-500">{item.message || "无留言"}</p>
                    {item.unread > 0 && (
                      <span className="rounded-full bg-blue-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                        新
                      </span>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </aside>

        <section className="flex min-h-[660px] flex-col">
          {!detail ? (
            <div className="m-auto max-w-sm px-6 text-center">
              <h2 className="font-semibold text-slate-800">选择一条官网表单</h2>
              <p className="mt-1 text-sm text-slate-500">提交后会自动出现在左侧，和实时聊天分开。</p>
            </div>
          ) : (
            <>
              <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
                <div>
                  <h2 className="font-semibold text-slate-900">{detail.company || detail.name}</h2>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {timeLabel(detail.created_at)}
                    {detail.status === "closed" ? " · 已处理" : " · 未处理"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setStatus(detail.status === "open" ? "closed" : "open")}
                    className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
                  >
                    {detail.status === "open" ? "标为已处理" : "重新打开"}
                  </button>
                  <button
                    type="button"
                    disabled={converting}
                    onClick={() => void convertToLead()}
                    className="export-btn-primary rounded-md px-3 py-1.5 text-sm disabled:opacity-60"
                  >
                    {converting ? "转入中…" : "转入线索"}
                  </button>
                </div>
              </header>
              <dl className="grid flex-1 gap-4 overflow-y-auto p-5 sm:grid-cols-2">
                <Field label="联系人" value={detail.name} />
                <Field label="邮箱" value={detail.email} />
                <Field label="电话 / WhatsApp" value={detail.phone} />
                <Field label="公司" value={detail.company} />
                <Field label="国家 / 城市" value={detail.country} />
                <Field label="产品" value={detail.request_type} />
                <Field label="系统 / 型号" value={detail.selected_product} />
                <Field label="用途" value={detail.application} />
                <Field label="要货时间" value={detail.required_by} />
                <Field label="数量" value={detail.quantity} />
                <Field label="配套服务" value={detail.services} />
                <Field label="附件" value={detail.attachments} />
                <Field label="来源页" value={detail.page} />
                <div className="sm:col-span-2">
                  <Field label="需求说明" value={detail.message} />
                </div>
              </dl>
              {detail.email ? (
                <div className="border-t border-slate-200 px-5 py-3 text-sm">
                  <Link href={`mailto:${detail.email}`} className="text-blue-700 hover:underline">
                    回复邮件 {detail.email}
                  </Link>
                </div>
              ) : null}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
