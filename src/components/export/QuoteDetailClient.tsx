"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useToast } from "@/components/ui/Toast";
import { QuoteFormClient } from "./QuoteFormClient";
import { ExportDeleteButton } from "./ExportDeleteButton";
import { parseResponseJson } from "@/lib/parse-response-json";
import { quoteStatusLabel } from "@/lib/export-display-labels";

export function QuoteDetailClient({ quoteId }: { quoteId: string }) {
  const { toast } = useToast();
  const [quote, setQuote] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [converting, setConverting] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);

  async function fetchQuote() {
    setLoading(true);
    try {
      const res = await fetch(`/api/export/quotes/${quoteId}`);
      const json = await parseResponseJson<{ data?: Record<string, unknown> }>(res);
      if (res.ok && json.data) setQuote(json.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchQuote();
  }, [quoteId]);

  async function handleConvert() {
    setConverting(true);
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
      if (oid) window.location.href = `/export/orders/${oid}`;
    } catch (e) {
      toast(e instanceof Error ? e.message : "转化失败", "error");
    } finally {
      setConverting(false);
    }
  }

  async function handleStatusUpdate(nextStatus: string) {
    setUpdatingStatus(nextStatus);
    try {
      const res = await fetch(`/api/export/quotes/${quoteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const json = await parseResponseJson<{ error?: string }>(res);
      if (!res.ok) throw new Error(json.error ?? "更新失败");
      toast("状态已更新");
      fetchQuote();
    } catch (e) {
      toast(e instanceof Error ? e.message : "更新失败", "error");
    } finally {
      setUpdatingStatus(null);
    }
  }

  if (loading) return <div className="p-8 text-center text-slate-500">加载中...</div>;
  if (!quote) return <div className="p-8 text-center text-slate-500">报价不存在</div>;

  if (editing) {
    return (
      <div>
        <QuoteFormClient
          quoteId={quoteId}
          initial={quote}
          onSuccess={() => {
            toast("保存成功");
            setEditing(false);
            fetchQuote();
          }}
          onCancel={() => setEditing(false)}
        />
        <button
          onClick={() => setEditing(false)}
          className="mt-4 text-sm text-slate-600 hover:underline"
        >
          取消编辑
        </button>
      </div>
    );
  }

  const status = String(quote.status);
  const orders = (quote.orders as { id: string }[]) ?? [];
  const alreadyConverted = orders.length > 0;
  const canConvert = !alreadyConverted && ["sent", "replied", "negotiating"].includes(status);
  const items = (quote.items as { productType: string; spec: string | null; description: string | null; quantity: string; unit: string; unitPrice: string; amount: string }[]) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="export-page-title text-xl font-semibold">{String(quote.quoteNo)}</h1>
          <p className="text-sm text-slate-500">
            {quote.customer && typeof quote.customer === "object" && "companyName" in quote.customer
              ? String((quote.customer as { companyName: string }).companyName)
              : ""}
          </p>
        </div>
        <div className="flex gap-2">
          {status === "draft" && (
            <button
              onClick={() => handleStatusUpdate("sent")}
              disabled={updatingStatus === "sent"}
              className="export-btn-primary rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50"
            >
              {updatingStatus === "sent" ? "处理中..." : "标记已发送"}
            </button>
          )}
          {(status === "sent" || status === "replied") && (
            <button
              onClick={() => handleStatusUpdate("negotiating")}
              disabled={updatingStatus === "negotiating"}
              className="export-btn-primary rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50"
            >
              {updatingStatus === "negotiating" ? "处理中..." : "标记跟进中"}
            </button>
          )}
          <button
            onClick={() => setEditing(true)}
            className="export-btn-secondary rounded-md px-4 py-2 text-sm"
          >
            编辑
          </button>
          {canConvert && (
            <button
              onClick={handleConvert}
              disabled={converting}
              className="export-btn-primary rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50"
            >
              {converting ? "转化中..." : "转订单"}
            </button>
          )}
          <ExportDeleteButton
            apiPath={`/api/export/quotes/${quoteId}`}
            redirectTo="/export/quotes"
            label="删除报价"
            className="rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700 hover:bg-red-100 disabled:opacity-50"
          />
          <Link
            href="/export/quotes"
            className="export-btn-secondary rounded-md px-4 py-2 text-sm"
          >
            返回
          </Link>
        </div>
      </div>

      <div className="export-card export-detail-group p-6">
        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-slate-500">状态</dt>
            <dd>
              <span className="rounded bg-slate-100 px-2 py-0.5 text-xs">
                {quoteStatusLabel[status] ?? status}
              </span>
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">报价日期</dt>
            <dd>{quote.quoteDate ? new Date(quote.quoteDate as string).toLocaleDateString("zh-CN") : "-"}</dd>
          </div>
          <div>
            <dt className="text-slate-500">币种</dt>
            <dd>{String(quote.currency ?? "-")}</dd>
          </div>
          <div>
            <dt className="text-slate-500">总金额</dt>
            <dd>{quote.totalAmount != null ? String(quote.totalAmount) : "-"}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Incoterm</dt>
            <dd>{String(quote.incoterm ?? "-")}</dd>
          </div>
          <div>
            <dt className="text-slate-500">有效期</dt>
            <dd>{quote.validityDate ? new Date(quote.validityDate as string).toLocaleDateString("zh-CN") : "-"}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-slate-500">产品摘要</dt>
            <dd className="mt-1 text-slate-700">{String(quote.productSummary ?? "-")}</dd>
          </div>
          {items.length > 0 && (
            <div className="sm:col-span-2">
              <dt className="mb-2 text-slate-500">明细</dt>
              <dd>
                <table className="export-table w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="py-2 text-left font-medium">产品类型</th>
                      <th className="py-2 text-left font-medium">规格</th>
                      <th className="py-2 text-right font-medium">数量</th>
                      <th className="py-2 text-left font-medium">单位</th>
                      <th className="py-2 text-right font-medium">单价</th>
                      <th className="py-2 text-right font-medium">金额</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, i) => (
                      <tr key={i} className="border-b border-slate-100">
                        <td className="py-2">{item.productType}</td>
                        <td className="py-2">{item.spec ?? "-"}</td>
                        <td className="py-2 text-right">{item.quantity}</td>
                        <td className="py-2">{item.unit}</td>
                        <td className="py-2 text-right">{item.unitPrice}</td>
                        <td className="py-2 text-right">{item.amount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </dd>
            </div>
          )}
          {quote.notes ? (
            <div className="sm:col-span-2">
              <dt className="text-slate-500">备注</dt>
              <dd className="mt-1 text-slate-700">{String(quote.notes)}</dd>
            </div>
          ) : null}
        </dl>
      </div>
    </div>
  );
}
