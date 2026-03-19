"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { QUOTE_STATUSES } from "@/lib/export-constants";
import { useToast } from "@/components/ui/Toast";
import { Pagination } from "./shared/Pagination";

interface Quote {
  id: string;
  quoteNo: string;
  customer: { companyName: string };
  totalAmount: string | null;
  status: string;
  quoteDate: string;
  createdAt: string;
  _count?: { orders: number };
}

interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

const STATUS_LABELS: Record<string, string> = {
  draft: "草稿",
  sent: "已发送",
  replied: "已回复",
  negotiating: "谈判中",
  won: "已成交",
  lost: "已流失",
  expired: "已过期",
};

export function QuotesClient() {
  const { toast } = useToast();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState("");
  const [ownerId, setOwnerId] = useState("");
  const [page, setPage] = useState(1);
  const [converting, setConverting] = useState<string | null>(null);
  const [users, setUsers] = useState<{ id: string; name: string }[]>([]);

  async function fetchUsers() {
    try {
      const res = await fetch("/api/export/users");
      const json = await res.json();
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
      if (keyword) params.set("keyword", keyword);
      if (ownerId) params.set("ownerId", ownerId);
      const res = await fetch(`/api/export/quotes?${params}`);
      if (!res.ok) throw new Error("加载失败");
      const json = await res.json();
      setQuotes(json.data || []);
      setPagination(json.pagination);
    } catch (e) {
      console.error(e);
      setQuotes([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchQuotes();
  }, [page, status, ownerId]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    fetchQuotes({ page: 1 });
  }

  async function handleConvert(quoteId: string) {
    setConverting(quoteId);
    try {
      const res = await fetch(`/api/export/quotes/${quoteId}/convert`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "转化失败");
      const oid = json.data?.id ?? json.orderId;
      toast("转化成功");
      if (oid) window.location.href = `/export/orders/${oid}`;
    } catch (e) {
      toast(e instanceof Error ? e.message : "转化失败", "error");
    } finally {
      setConverting(null);
    }
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
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">全部状态</option>
          {QUOTE_STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s] ?? s}
            </option>
          ))}
        </select>
        <select
          value={ownerId}
          onChange={(e) => {
            setOwnerId(e.target.value);
            setPage(1);
          }}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">全部负责人</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
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
                <th className="px-4 py-3 text-left font-medium text-slate-700">报价日期</th>
                <th className="px-4 py-3 text-left font-medium text-slate-700">操作</th>
              </tr>
            </thead>
            <tbody>
              {quotes.map((q) => (
                <tr
                  key={q.id}
                  className="cursor-pointer border-b border-slate-100 hover:bg-slate-50"
                  onClick={() => (window.location.href = `/export/quotes/${q.id}`)}
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
                      {STATUS_LABELS[q.status] ?? q.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {new Date(q.quoteDate).toLocaleDateString("zh-CN")}
                  </td>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <span className="flex gap-3">
                      <Link href={`/export/quotes/${q.id}`} className="text-teal-600 hover:underline">
                        详情
                      </Link>
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

      {pagination && pagination.totalPages > 1 && (
        <Pagination
          page={page}
          totalPages={pagination.totalPages}
          total={pagination.total}
          onPageChange={(p) => setPage(p)}
        />
      )}
    </div>
  );
}
