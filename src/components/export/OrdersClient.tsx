"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Pagination } from "./shared/Pagination";
import { parseResponseJson } from "@/lib/parse-response-json";
import { paymentStatusLabel, productionStatusLabel, shippingStatusLabel } from "@/lib/export-display-labels";
import { buildListUrl } from "@/lib/export/url-params";

interface Order {
  id: string;
  orderNo: string;
  customer: { companyName: string };
  totalAmount: string | null;
  paymentStatus: string;
  productionStatus: string;
  shippingStatus: string;
  orderDate: string;
  eta: string | null;
  createdAt: string;
  updatedAt: string;
}

interface PaginationData {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export function OrdersClient() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const keywordParam = searchParams.get("keyword") ?? "";
  const status = searchParams.get("status") ?? "";
  const ownerId = searchParams.get("ownerId") ?? "";
  const since = searchParams.get("since") ?? "";
  const sortBy = searchParams.get("sortBy") ?? "orderDate";
  const sortOrder = searchParams.get("sortOrder") ?? "desc";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const [orders, setOrders] = useState<Order[]>([]);
  const [pagination, setPagination] = useState<PaginationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState(keywordParam);
  const [users, setUsers] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    setKeyword(keywordParam);
  }, [keywordParam]);

  function updateUrl(updates: Record<string, string | number | undefined>) {
    const merged = {
      keyword: keyword || undefined,
      status: status || undefined,
      ownerId: ownerId || undefined,
      since: since || undefined,
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

  async function fetchOrders(overrides?: { page?: number }) {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(overrides?.page ?? page));
      if (keywordParam) params.set("keyword", keywordParam);
      if (status) params.set("status", status);
      if (ownerId) params.set("ownerId", ownerId);
      if (since) params.set("since", since);
      if (sortBy) params.set("sortBy", sortBy);
      if (sortOrder) params.set("sortOrder", sortOrder);
      const res = await fetch(`/api/export/orders?${params}`);
      const json = await parseResponseJson<{
        error?: string;
        data?: Order[];
        pagination?: PaginationData;
      }>(res);
      if (!res.ok) throw new Error(json.error ?? "加载失败");
      setOrders(json.data || []);
      setPagination(json.pagination ?? null);
    } catch (e) {
      console.error(e);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchOrders();
  }, [page, status, ownerId, since, keywordParam, sortBy, sortOrder]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    updateUrl({ keyword: keyword || undefined, page: 1 });
  }

  function renderTime(order: Order) {
    if (sortBy === "createdAt") return new Date(order.createdAt).toLocaleDateString("zh-CN");
    if (sortBy === "updatedAt") return new Date(order.updatedAt).toLocaleDateString("zh-CN");
    if (sortBy === "eta") return order.eta ? new Date(order.eta).toLocaleDateString("zh-CN") : "-";
    return new Date(order.orderDate).toLocaleDateString("zh-CN");
  }

  return (
    <div className="space-y-4">
      <div className="export-filter-shell flex flex-wrap items-center gap-4 p-3">
        <form onSubmit={handleSearch} className="flex flex-wrap gap-2">
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="订单号/客户"
            className="px-3 py-2 text-sm"
          />
          <select
            value={status}
            onChange={(e) => updateUrl({ status: e.target.value || undefined, page: 1 })}
            className="px-3 py-2 text-sm"
          >
            <option value="">全部状态</option>
            <option value="unpaid">未付</option>
            <option value="partial_paid">部分付</option>
            <option value="paid">已付</option>
          </select>
          <select
            value={ownerId}
            onChange={(e) => updateUrl({ ownerId: e.target.value || undefined, page: 1 })}
            className="px-3 py-2 text-sm"
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
            className="px-3 py-2 text-sm"
          >
            <option value="orderDate:desc">最新订单日</option>
            <option value="createdAt:desc">最新创建</option>
            <option value="updatedAt:desc">最新更新</option>
            <option value="eta:asc">最近 ETA</option>
            <option value="totalAmount:desc">金额从高到低</option>
          </select>
          <button type="submit" className="export-btn-secondary rounded-md px-4 py-2 text-sm">
            搜索
          </button>
        </form>
        <Link
          href="/export/orders/new"
          className="export-btn-primary rounded-md px-4 py-2 text-sm font-medium"
        >
          新建订单
        </Link>
        <a
          href={`/api/export/orders/export?${new URLSearchParams({
            ...(keywordParam ? { keyword: keywordParam } : {}),
            ...(status ? { status } : {}),
            ...(ownerId ? { ownerId } : {}),
            ...(since ? { since } : {}),
          }).toString()}`}
          download
          className="export-btn-secondary rounded-md px-4 py-2 text-sm"
        >
          导出 CSV
        </a>
      </div>

      <div className="export-card overflow-x-auto overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500">加载中...</div>
        ) : orders.length === 0 ? (
          <div className="p-8 text-center text-slate-500">暂无订单</div>
        ) : (
          <table className="export-table w-full text-sm">
            <thead className="border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-slate-700">订单号</th>
                <th className="px-4 py-3 text-left font-medium text-slate-700">客户</th>
                <th className="px-4 py-3 text-left font-medium text-slate-700">金额</th>
                <th className="px-4 py-3 text-left font-medium text-slate-700">付款</th>
                <th className="px-4 py-3 text-left font-medium text-slate-700">生产</th>
                <th className="px-4 py-3 text-left font-medium text-slate-700">发货</th>
                <th className="px-4 py-3 text-left font-medium text-slate-700">时间</th>
                <th className="px-4 py-3 text-left font-medium text-slate-700">操作</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr
                  key={o.id}
                  className="cursor-pointer border-b border-slate-100"
                  onClick={() => router.push(`/export/orders/${o.id}`)}
                >
                  <td className="px-4 py-3 font-medium text-slate-800">{o.orderNo}</td>
                  <td className="px-4 py-3 text-slate-600">{o.customer.companyName}</td>
                  <td className="px-4 py-3 text-slate-600">{o.totalAmount != null ? String(o.totalAmount) : "-"}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded px-2 py-0.5 text-xs ${
                        o.paymentStatus === "paid"
                          ? "bg-green-50 text-green-700"
                          : o.paymentStatus === "partial_paid"
                            ? "bg-amber-50 text-amber-700"
                            : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {paymentStatusLabel[o.paymentStatus] ?? o.paymentStatus}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{productionStatusLabel[o.productionStatus] ?? o.productionStatus}</td>
                  <td className="px-4 py-3 text-slate-600">{shippingStatusLabel[o.shippingStatus] ?? o.shippingStatus}</td>
                  <td className="px-4 py-3 text-slate-500">{renderTime(o)}</td>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <Link href={`/export/orders/${o.id}`} className="text-teal-600 hover:underline">
                      详情
                    </Link>
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
