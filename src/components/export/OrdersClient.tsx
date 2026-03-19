"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Pagination } from "./shared/Pagination";

interface Order {
  id: string;
  orderNo: string;
  customer: { companyName: string };
  totalAmount: string | null;
  paymentStatus: string;
  productionStatus: string;
  shippingStatus: string;
  orderDate: string;
  createdAt: string;
}

interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

const PAYMENT_LABELS: Record<string, string> = {
  unpaid: "未付",
  partial_paid: "部分付",
  paid: "已付",
};

export function OrdersClient() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState("");
  const [ownerId, setOwnerId] = useState("");
  const [page, setPage] = useState(1);
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

  async function fetchOrders(overrides?: { page?: number }) {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(overrides?.page ?? page));
      if (keyword) params.set("keyword", keyword);
      if (status) params.set("status", status);
      if (ownerId) params.set("ownerId", ownerId);
      const res = await fetch(`/api/export/orders?${params}`);
      if (!res.ok) throw new Error("加载失败");
      const json = await res.json();
      setOrders(json.data || []);
      setPagination(json.pagination);
    } catch (e) {
      console.error(e);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchOrders();
  }, [page, status, ownerId]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    fetchOrders({ page: 1 });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-4">
        <form onSubmit={handleSearch} className="flex flex-wrap gap-2">
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="订单号/客户"
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">全部状态</option>
            <option value="unpaid">未付</option>
            <option value="partial_paid">部分付</option>
            <option value="paid">已付</option>
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
          <button type="submit" className="rounded-md bg-slate-700 px-4 py-2 text-sm text-white hover:bg-slate-800">
            搜索
          </button>
        </form>
        <Link
          href="/export/orders/new"
          className="rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
        >
          新建订单
        </Link>
        <a
          href="/api/export/orders/export"
          download
          className="rounded-md border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50"
        >
          导出 CSV
        </a>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        {loading ? (
          <div className="p-8 text-center text-slate-500">加载中...</div>
        ) : orders.length === 0 ? (
          <div className="p-8 text-center text-slate-500">暂无订单</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-slate-700">订单号</th>
                <th className="px-4 py-3 text-left font-medium text-slate-700">客户</th>
                <th className="px-4 py-3 text-left font-medium text-slate-700">金额</th>
                <th className="px-4 py-3 text-left font-medium text-slate-700">付款</th>
                <th className="px-4 py-3 text-left font-medium text-slate-700">生产</th>
                <th className="px-4 py-3 text-left font-medium text-slate-700">发货</th>
                <th className="px-4 py-3 text-left font-medium text-slate-700">订单日期</th>
                <th className="px-4 py-3 text-left font-medium text-slate-700">操作</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr
                  key={o.id}
                  className="cursor-pointer border-b border-slate-100 hover:bg-slate-50"
                  onClick={() => (window.location.href = `/export/orders/${o.id}`)}
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
                      {PAYMENT_LABELS[o.paymentStatus] ?? o.paymentStatus}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{o.productionStatus}</td>
                  <td className="px-4 py-3 text-slate-600">{o.shippingStatus}</td>
                  <td className="px-4 py-3 text-slate-500">
                    {new Date(o.orderDate).toLocaleDateString("zh-CN")}
                  </td>
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
