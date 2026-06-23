"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { QUOTE_STATUSES } from "@/lib/export-constants";
import { quoteStatusLabel } from "@/lib/export-display-labels";
import { useToast } from "@/components/ui/Toast";
import { Pagination } from "./shared/Pagination";
import { parseResponseJson } from "@/lib/parse-response-json";
import { buildListUrl } from "@/lib/export/url-params";

interface Quote {
  id: string;
  quoteNo: string;
  customer: { companyName: string };
  totalAmount: string | null;
  status: string;
  quoteDate: string;
  createdAt: string;
  updatedAt: string;
  _count?: { orders: number };
}

interface PaginationData {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export function QuotesClient() {
  const { toast } = useToast();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const keywordParam = searchParams.get("keyword") ?? "";
  const status = searchParams.get("status") ?? "";
  const ownerId = searchParams.get("ownerId") ?? "";
  const sortBy = searchParams.get("sortBy") ?? "quoteDate";
  const sortOrder = searchParams.get("sortOrder") ?? "desc";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [pagination, setPagination] = useState<PaginationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState(keywordParam);
  const [converting, setConverting] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [users, setUsers] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    setKeyword(keywordParam);
  }, [keywordParam]);

  function updateUrl(updates: Record<string, string | number | undefined>) {
    const merged = {
      keyword: keyword || undefined,
      status: status || undefined,
      ownerId: ownerId || undefined,
      sortBy,
      sortOrder,
      page,
      ...updates,
    };
    router.replace(buildListUrl(pathname, merged));
  }

  function updateSort(value: string) {
    const [nextSortBy, nextSortOrder] = value.split(":");
    updateUrl({ sortBy: nextSortBy, sortOrder: nextSortOrder, page: 1 });
  }

  async function fetchUsers() {
    try {
      const res = await fetch("/api/export/users");
      const json = await parseResponseJson<{ data?: { id: string; name: string }[] }>(res);
      if (res.ok && json.data) setUsers(json.data);
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchQuotes(overrides?: { page?: number }) {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(overrides?.page ?? page));
      if (status) params.set("status", status);
      if (keywordParam) params.set("keyword", keywordParam);
      if (ownerId) params.set("ownerId", ownerId);
      if (sortBy) params.set("sortBy", sortBy);
      if (sortOrder) params.set("sortOrder", sortOrder);
      const res = await fetch(`/api/export/quotes?${params}`);
      const json = await parseResponseJson<{
        error?: string;
        data?: Quote[];
        pagination?: PaginationData;
      }>(res);
      if (!res.ok) throw new Error(json.error ?? "加载失败");
      setQuotes(json.data || []);
      setPagination(json.pagination ?? null);
    } catch (e) {
      console.error(e);
      setQuotes([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchQuotes();
  }, [page, status, ownerId, keywordParam, sortBy, sortOrder]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    updateUrl({ keyword: keyword || undefined, page: 1 });
  }

  async function handleConvert(quoteId: string) {
    setConverting(quoteId);
    try {
      const res = await fetch(`/api/export/quotes/${quoteId}/convert`, { method: "POST" });
      const json = await parseResponseJson<{
        error?: string;
        data?: { id?: string };
        orderId?: string;
      }>(res);
      if (!res.ok) throw new Error(json.error ?? "转化失败");
      const oid = json.data?.id ?? json.orderId;
      toast("转化成功");
      if (oid) router.push(`/export/orders/${oid}`);
    } catch (e) {
      toast(e instanceof Error ? e.message : "转化失败", "error");
    } finally {
      setConverting(null);
    }
  }

  async function handleStatusUpdate(quoteId: string, nextStatus: string) {
    setUpdatingStatus(`${quoteId}:${nextStatus}`);
    try {
      const res = await fetch(`/api/export/quotes/${quoteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const json = await parseResponseJson<{ error?: string }>(res);
      if (!res.ok) throw new Error(json.error ?? "更新失败");
      toast("状态已更新");
      fetchQuotes({ page });
    } catch (e) {
      toast(e instanceof Error ? e.message : "更新失败", "error");
    } finally {
      setUpdatingStatus(null);
    }
  }

  function renderTime(quote: Quote) {
    if (sortBy === "createdAt") return new Date(quote.createdAt).toLocaleDateString("zh-CN");
    if (sortBy === "updatedAt") return new Date(quote.updatedAt).toLocaleDateString("zh-CN");
    return new Date(quote.quoteDate).toLocaleDateString("zh-CN");
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-4">
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="报价号/客户"
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <button type="submit" className="rounded-md bg-slate-700 px-4 py-2 text-sm text-white hover:bg-slate-800">
            搜索
          </button>
        </form>
        <select
          value={status}
          onChange={(e) => updateUrl({ status: e.target.value || undefined, page: 1 })}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">全部状态</option>
          {QUOTE_STATUSES.map((s) => (
            <option key={s} value={s}>
              {quoteStatusLabel[s] ?? s}
            </option>
          ))}
        </select>
        <select
          value={ownerId}
          onChange={(e) => updateUrl({ ownerId: e.target.value || undefined, page: 1 })}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">全部负责人</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>
        <select
          value={`${sortBy}:${sortOrder}`}
          onChange={(e) => updateSort(e.target.value)}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="quoteDate:desc">最新报价日</option>
          <option value="createdAt:desc">最新创建</option>
          <option value="updatedAt:desc">最新更新</option>
          <option value="validityDate:asc">最近到期</option>
          <option value="totalAmount:desc">金额从高到低</option>
        </select>
        <Link
          href="/export/quotes/new"
          className="rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
        >
          新建报价
        </Link>
        <a
          href="/api/export/quotes/export"
          download
          className="rounded-md border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50"
        >
          导出 CSV
        </a>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        {loading ? (
          <div className="p-8 text-center text-slate-500">加载中...</div>
        ) : quotes.length === 0 ? (
          <div className="p-8 text-center text-slate-500">暂无报价</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-slate-700">报价号</th>
                <th className="px-4 py-3 text-left font-medium text-slate-700">客户</th>
                <th className="px-4 py-3 text-left font-medium text-slate-700">金额</th>
                <th className="px-4 py-3 text-left font-medium text-slate-700">状态</th>
                <th className="px-4 py-3 text-left font-medium text-slate-700">时间</th>
                <th className="px-4 py-3 text-left font-medium text-slate-700">操作</th>
              </tr>
            </thead>
            <tbody>
              {quotes.map((q) => (
                <tr
                  key={q.id}
                  className="cursor-pointer border-b border-slate-100 hover:bg-slate-50"
                  onClick={() => router.push(`/export/quotes/${q.id}`)}
                >
                  <td className="px-4 py-3 font-medium text-slate-800">{q.quoteNo}</td>
                  <td className="px-4 py-3 text-slate-600">{q.customer.companyName}</td>
                  <td className="px-4 py-3 text-slate-600">{q.totalAmount != null ? String(q.totalAmount) : "-"}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded px-2 py-0.5 text-xs ${
                        q.status === "won"
                          ? "bg-green-50 text-green-700"
                          : q.status === "lost" || q.status === "expired"
                            ? "bg-slate-100 text-slate-500"
                            : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {quoteStatusLabel[q.status] ?? q.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{renderTime(q)}</td>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <span className="flex flex-wrap gap-3">
                      <Link href={`/export/quotes/${q.id}`} className="text-teal-600 hover:underline">
                        详情
                      </Link>
                      {q.status === "draft" && (
                        <button
                          onClick={() => handleStatusUpdate(q.id, "sent")}
                          disabled={updatingStatus === `${q.id}:sent`}
                          className="text-teal-600 hover:underline disabled:opacity-50"
                        >
                          {updatingStatus === `${q.id}:sent` ? "处理中..." : "标记已发送"}
                        </button>
                      )}
                      {(q.status === "sent" || q.status === "replied") && (
                        <button
                          onClick={() => handleStatusUpdate(q.id, "negotiating")}
                          disabled={updatingStatus === `${q.id}:negotiating`}
                          className="text-teal-600 hover:underline disabled:opacity-50"
                        >
                          {updatingStatus === `${q.id}:negotiating` ? "处理中..." : "标记跟进中"}
                        </button>
                      )}
                      {(q.status === "sent" || q.status === "replied" || q.status === "negotiating") && !(q._count?.orders ?? 0) && (
                        <button
                          onClick={() => handleConvert(q.id)}
                          disabled={!!converting}
                          className="text-teal-600 hover:underline disabled:opacity-50"
                        >
                          {converting === q.id ? "转化中..." : "转订单"}
                        </button>
                      )}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {pagination && pagination.total > 0 && (
        <Pagination
          page={page}
          totalPages={pagination.totalPages}
          total={pagination.total}
          onPageChange={(p) => updateUrl({ page: p })}
        />
      )}
    </div>
  );
}
