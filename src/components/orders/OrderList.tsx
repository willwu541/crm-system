"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Order {
  id: string;
  orderNo: string;
  customerName: string;
  projectName: string;
  status: string;
  mainStatus: string | null;
  isQuoted: boolean;
  productionMode: string | null;
  hasSelectedSupplier: boolean;
  customerPaymentStatus: string | null;
  supplierPaymentStatus: string | null;
  createdAt: string;
  createdBy: { name: string };
  _count: { quotes: number };
}

interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

const MAIN_STATUS_MAP: Record<string, string> = {
  CONVERTED: "已成交",
  IN_PRODUCTION: "生产中",
  PENDING_SHIPMENT: "待发货",
  COMPLETED: "已完成",
  CANCELLED: "已取消",
};

const PRODUCTION_MODE_MAP: Record<string, string> = {
  SELF: "自制",
  OUTSOURCE: "外放",
  MIXED: "混合",
};

const PAYMENT_STATUS_MAP: Record<string, string> = {
  UNPAID: "未收",
  PARTIAL: "部分收",
  PAID: "已收",
};

export function OrderList() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [mainStatus, setMainStatus] = useState("");
  const [keyword, setKeyword] = useState("");
  const [page, setPage] = useState(1);

  async function fetchOrders(overrides?: { page?: number }) {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(overrides?.page ?? page));
      if (mainStatus) params.set("mainStatus", mainStatus);
      if (keyword) params.set("keyword", keyword);
      const res = await fetch(`/api/orders?${params}`);
      if (!res.ok) throw new Error("加载失败");
      const json = await res.json();
      setOrders(json.data);
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
  }, [page, mainStatus]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    fetchOrders({ page: 1 });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-4">
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="订单号/客户/项目"
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="rounded-md bg-slate-700 px-4 py-2 text-sm text-white hover:bg-slate-800"
          >
            搜索
          </button>
        </form>
        <select
          value={mainStatus}
          onChange={(e) => {
            setMainStatus(e.target.value);
            setPage(1);
          }}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">全部状态</option>
          <option value="CONVERTED">已成交</option>
          <option value="IN_PRODUCTION">生产中</option>
          <option value="PENDING_SHIPMENT">待发货</option>
          <option value="COMPLETED">已完成</option>
          <option value="CANCELLED">已取消</option>
        </select>
        <Link
          href="/orders/new"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          新建订单
        </Link>
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
                <th className="px-4 py-3 text-left font-medium text-slate-700">订单编号</th>
                <th className="px-4 py-3 text-left font-medium text-slate-700">客户</th>
                <th className="px-4 py-3 text-left font-medium text-slate-700">项目</th>
                <th className="px-4 py-3 text-left font-medium text-slate-700">主状态</th>
                <th className="px-4 py-3 text-left font-medium text-slate-700">标签</th>
                <th className="px-4 py-3 text-left font-medium text-slate-700">报价</th>
                <th className="px-4 py-3 text-left font-medium text-slate-700">创建人</th>
                <th className="px-4 py-3 text-left font-medium text-slate-700">创建时间</th>
                <th className="px-4 py-3 text-left font-medium text-slate-700">操作</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-800">{o.orderNo}</td>
                  <td className="px-4 py-3 text-slate-600">{o.customerName}</td>
                  <td className="px-4 py-3 text-slate-600">{o.projectName}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded px-2 py-0.5 text-xs ${
                        o.mainStatus === "CONVERTED"
                          ? "bg-blue-50 text-blue-700"
                          : o.mainStatus === "IN_PRODUCTION"
                            ? "bg-amber-50 text-amber-700"
                            : o.mainStatus === "PENDING_SHIPMENT"
                              ? "bg-purple-50 text-purple-700"
                              : o.mainStatus === "COMPLETED"
                                ? "bg-green-50 text-green-700"
                                : o.mainStatus === "CANCELLED"
                                  ? "bg-slate-100 text-slate-500"
                                  : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {o.mainStatus ? MAIN_STATUS_MAP[o.mainStatus] : "未设置"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="flex flex-wrap gap-1">
                      {o.isQuoted && (
                        <span className="rounded bg-amber-50 px-2 py-0.5 text-xs text-amber-700">
                          已报价
                        </span>
                      )}
                      {o.productionMode && (
                        <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                          {PRODUCTION_MODE_MAP[o.productionMode]}
                        </span>
                      )}
                      {o.hasSelectedSupplier && (
                        <span className="rounded bg-green-50 px-2 py-0.5 text-xs text-green-700">
                          已选外协
                        </span>
                      )}
                      {o.customerPaymentStatus && (
                        <span className="rounded bg-blue-50 px-2 py-0.5 text-xs text-blue-700">
                          客户{PAYMENT_STATUS_MAP[o.customerPaymentStatus]}
                        </span>
                      )}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{o._count.quotes}</td>
                  <td className="px-4 py-3 text-slate-600">{o.createdBy.name}</td>
                  <td className="px-4 py-3 text-slate-500">
                    {new Date(o.createdAt).toLocaleDateString("zh-CN")}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/orders/${o.id}`}
                      className="text-blue-600 hover:underline"
                    >
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
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-600">
            共 {pagination.total} 条
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="rounded border border-slate-300 px-3 py-1 text-sm disabled:opacity-50"
            >
              上一页
            </button>
            <span className="py-1 text-sm text-slate-600">
              {page} / {pagination.totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
              disabled={page >= pagination.totalPages}
              className="rounded border border-slate-300 px-3 py-1 text-sm disabled:opacity-50"
            >
              下一页
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
