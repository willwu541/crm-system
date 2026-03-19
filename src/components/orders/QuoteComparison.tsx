"use client";

import { useState, useEffect } from "react";

interface OrderItem {
  id: string;
  productType: string;
  specModel: string;
  quantity: number | { toString: () => string };
  unit: string;
}

interface QuoteItem {
  orderItemId: string;
  price: number;
  remark: string | null;
  orderItem: OrderItem;
}

interface Quote {
  id: string;
  supplierName: string;
  contactName: string;
  contactPhone: string;
  contactWechat: string | null;
  totalRemark: string | null;
  expectedDelivery: string | null;
  includeTax: boolean;
  includeShipping: boolean;
  status: string;
  submittedAt: string;
  totalPrice: number;
  items: QuoteItem[];
}

interface Props {
  orderId: string;
  orderItems: OrderItem[];
}

const STATUS_MAP: Record<string, string> = {
  PENDING: "待定",
  PREFERRED: "意向",
  SELECTED: "中选",
};

export function QuoteComparison({ orderId, orderItems }: Props) {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState("submittedAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  async function fetchQuotes() {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/orders/${orderId}/quotes?sortBy=${sortBy}&sortOrder=${sortOrder}`
      );
      const json = await res.json();
      if (res.ok) setQuotes(json.data || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchQuotes();
  }, [orderId, sortBy, sortOrder]);

  async function updateStatus(quoteId: string, status: string) {
    try {
      const res = await fetch(`/api/quotes/${quoteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) fetchQuotes();
    } catch (e) {
      console.error(e);
    }
  }

  function getPriceForItem(quote: Quote, orderItemId: string): number | null {
    const qi = quote.items.find((i) => i.orderItemId === orderItemId);
    return qi ? Number(qi.price) : null;
  }

  if (loading) return <div className="text-slate-500">加载中...</div>;

  if (quotes.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-slate-500">
        暂无报价
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm text-slate-600">排序：</span>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="rounded border border-slate-300 px-2 py-1.5 text-sm min-w-0"
        >
          <option value="submittedAt">提交时间</option>
          <option value="totalPrice">总价</option>
          <option value="expectedDelivery">交期</option>
        </select>
        <select
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value as "asc" | "desc")}
          className="rounded border border-slate-300 px-2 py-1.5 text-sm min-w-0"
        >
          <option value="asc">升序</option>
          <option value="desc">降序</option>
        </select>
      </div>

      {/* 手机端卡片布局 */}
      <div className="md:hidden space-y-3">
        {quotes.map((quote) => (
          <div
            key={quote.id}
            className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
              <div>
                <div className="font-medium text-slate-800">{quote.supplierName}</div>
                <div className="text-xs text-slate-500">
                  {quote.contactName} {quote.contactPhone}
                </div>
              </div>
              <div className="text-lg font-semibold text-teal-700">
                ¥{quote.totalPrice.toFixed(2)}
              </div>
            </div>
            <div className="flex flex-wrap gap-2 text-xs mb-2">
              <span className="text-slate-500">
                交期：{quote.expectedDelivery ? new Date(quote.expectedDelivery).toLocaleDateString("zh-CN") : "-"}
              </span>
              <span className="text-slate-500">
                {quote.includeTax ? "含税 " : ""}
                {quote.includeShipping ? "含运" : ""}
                {!quote.includeTax && !quote.includeShipping ? "-" : ""}
              </span>
            </div>
            {quote.totalRemark && (
              <div className="text-xs text-slate-600 mb-3 p-2 bg-slate-50 rounded">
                <span className="font-medium text-slate-500">总体备注：</span>
                {quote.totalRemark}
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              {orderItems.map((item) => {
                const price = getPriceForItem(quote, item.id);
                return (
                  <div key={item.id} className="text-xs">
                    <span className="text-slate-500">{item.specModel}：</span>
                    <span>{price != null ? `¥${price.toFixed(2)}` : "-"}</span>
                  </div>
                );
              })}
            </div>
            <div className="mt-3 pt-3 border-t border-slate-100">
              <select
                value={quote.status}
                onChange={(e) => updateStatus(quote.id, e.target.value)}
                className="rounded border border-slate-200 px-2 py-1.5 text-sm w-full"
              >
                <option value="PENDING">待定</option>
                <option value="PREFERRED">意向</option>
                <option value="SELECTED">中选</option>
              </select>
            </div>
          </div>
        ))}
      </div>

      {/* 桌面端表格 */}
      <div className="hidden md:block overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full min-w-[800px] text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="sticky left-0 z-10 min-w-[140px] bg-slate-50 px-3 py-2 text-left font-medium">
                厂家
              </th>
              {orderItems.map((item) => (
                <th
                  key={item.id}
                  className="min-w-[100px] px-3 py-2 text-left font-medium"
                >
                  {item.specModel}
                  <span className="block text-xs font-normal text-slate-500">
                    {typeof item.quantity === "number"
                      ? item.quantity
                      : Number(item.quantity)} {item.unit}
                  </span>
                </th>
              ))}
              <th className="min-w-[100px] px-3 py-2 text-left font-medium">
                总价
              </th>
              <th className="min-w-[100px] px-3 py-2 text-left font-medium">
                交期
              </th>
              <th className="min-w-[100px] px-3 py-2 text-left font-medium">
                含税/含运
              </th>
              <th className="min-w-[120px] px-3 py-2 text-left font-medium">
                状态
              </th>
              <th className="min-w-[140px] px-3 py-2 text-left font-medium">
                总体备注
              </th>
            </tr>
          </thead>
          <tbody>
            {quotes.map((quote) => (
              <tr
                key={quote.id}
                className="border-b border-slate-100 hover:bg-slate-50"
              >
                <td className="sticky left-0 z-10 bg-white px-3 py-2">
                  <div className="font-medium">{quote.supplierName}</div>
                  <div className="text-xs text-slate-500">
                    {quote.contactName} {quote.contactPhone}
                  </div>
                </td>
                {orderItems.map((item) => (
                  <td key={item.id} className="px-3 py-2">
                    {getPriceForItem(quote, item.id) != null ? (
                      <span>
                        ¥{getPriceForItem(quote, item.id)?.toFixed(2)}
                      </span>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>
                ))}
                <td className="px-3 py-2 font-medium">
                  ¥{quote.totalPrice.toFixed(2)}
                </td>
                <td className="px-3 py-2">
                  {quote.expectedDelivery
                    ? new Date(quote.expectedDelivery).toLocaleDateString(
                        "zh-CN"
                      )
                    : "-"}
                </td>
                <td className="px-3 py-2 text-xs">
                  {quote.includeTax ? "含税 " : ""}
                  {quote.includeShipping ? "含运" : ""}
                  {!quote.includeTax && !quote.includeShipping ? "-" : ""}
                </td>
                <td className="px-3 py-2">
                  <select
                    value={quote.status}
                    onChange={(e) =>
                      updateStatus(quote.id, e.target.value)
                    }
                    className="rounded border border-slate-200 px-2 py-1 text-xs"
                  >
                    <option value="PENDING">待定</option>
                    <option value="PREFERRED">意向</option>
                    <option value="SELECTED">中选</option>
                  </select>
                </td>
                <td className="max-w-[200px] px-3 py-2 text-xs text-slate-600">
                  {quote.totalRemark ? (
                    <span title={quote.totalRemark} className="line-clamp-2">
                      {quote.totalRemark}
                    </span>
                  ) : (
                    "-"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
