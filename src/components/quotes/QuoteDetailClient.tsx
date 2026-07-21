"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";
import { parseResponseJson } from "@/lib/parse-response-json";

const STATUS_LABELS: Record<string, string> = { DRAFT: "草稿", SENT: "已发送", NEGOTIATING: "谈判中", WON: "已成交", LOST: "已丢失", };
const STATUS_COLORS: Record<string, string> = { DRAFT: "bg-slate-100 text-slate-600", SENT: "bg-blue-100 text-blue-700", NEGOTIATING: "bg-yellow-100 text-yellow-700", WON: "bg-emerald-100 text-emerald-700", LOST: "bg-red-100 text-red-700", };

export function QuoteDetailClient({ quoteId }: { quoteId: string }) {
  const { toast } = useToast();
  const router = useRouter();
  const [quote, setQuote] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [converting, setConverting] = useState(false);

  async function fetchQuote() {
    setLoading(true);
    try {
      const res = await fetch(`/api/customer-quotes/${quoteId}`);
      const json = await parseResponseJson<{ data: any }>(res);
      if (res.ok) setQuote(json.data);
    } finally { setLoading(false); }
  }

  useEffect(() => { fetchQuote(); }, [quoteId]);

  async function handleStatusChange(newStatus: string) {
    try {
      const res = await fetch(`/api/customer-quotes/${quoteId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: newStatus }) });
      if (!res.ok) throw new Error("更新失败");
      fetchQuote();
    } catch (e) { toast(e instanceof Error ? e.message : "更新失败"); }
  }

  async function handleConvert() {
    if (!confirm("确认将此报价转为订单？")) return;
    setConverting(true);
    try {
      const res = await fetch(`/api/customer-quotes/${quoteId}/convert`, { method: "POST" });
      const json = await parseResponseJson<{ error?: string; data?: { id: string } }>(res);
      if (!res.ok) throw new Error(json.error ?? "转化失败");
      toast("已转为订单");
      router.push(`/orders/${json.data?.id}`);
    } catch (e) { toast(e instanceof Error ? e.message : "转化失败"); }
    finally { setConverting(false); }
  }

  if (loading) return <div className="p-8 text-center text-slate-500">加载中...</div>;
  if (!quote) return <div className="p-8 text-center text-slate-500">报价不存在</div>;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <Link href="/quotes" className="text-sm text-teal-700 hover:underline">&larr; 返回列表</Link>
        <div className="flex gap-2">
          {quote.status !== "WON" && quote.status !== "LOST" && (
            <button onClick={handleConvert} disabled={converting} className="rounded-md bg-emerald-600 px-4 py-2 text-sm text-white hover:bg-emerald-700 disabled:opacity-50">
              {converting ? "转化中..." : "转为订单"}
            </button>
          )}
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <div className="mb-4 flex items-center gap-3">
          <h2 className="text-xl font-semibold text-slate-800">{quote.quoteNo}</h2>
          <span className={`rounded px-2 py-0.5 text-xs ${STATUS_COLORS[quote.status]}`}>{STATUS_LABELS[quote.status]}</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-3 text-sm">
          <div><span className="text-slate-500">客户：</span><Link href={`/customers/${quote.customer?.id}`} className="text-teal-700 hover:underline">{quote.customer?.name}</Link></div>
          <div><span className="text-slate-500">联系人：</span>{quote.contactName}</div>
          <div><span className="text-slate-500">电话：</span>{quote.contactPhone}</div>
          {quote.projectName && <div className="sm:col-span-3"><span className="text-slate-500">项目：</span>{quote.projectName}</div>}
          <div><span className="text-slate-500">含税：</span>{quote.includeTax ? "是" : "否"}</div>
          <div><span className="text-slate-500">含运费：</span>{quote.includeShipping ? "是" : "否"}</div>
          {quote.paymentTerm && <div><span className="text-slate-500">付款：</span>{quote.paymentTerm}</div>}
          {quote.wonOrder && <div className="sm:col-span-3"><span className="text-slate-500">已转订单：</span><Link href={`/orders/${quote.wonOrder.id}`} className="text-teal-700 hover:underline">{quote.wonOrder.orderNo}</Link></div>}
        </div>
      </div>

      {/* 明细 */}
      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <h3 className="mb-4 font-semibold text-slate-700">产品明细</h3>
        <table className="w-full text-sm">
          <thead className="border-b"><tr><th className="py-2 text-left">类型</th><th className="py-2 text-left">规格型号</th><th className="py-2 text-left">材质</th><th className="py-2 text-left">尺寸</th><th className="py-2 text-right">数量</th><th>单位</th><th className="py-2 text-right">单价</th><th className="py-2 text-right">金额</th><th className="py-2 text-right">理论吨</th><th className="py-2 text-right">过泵吨</th></tr></thead>
          <tbody>
            {quote.items?.map((it: any, i: number) => (
              <tr key={it.id || i} className="border-b"><td className="py-2">{it.productType}</td><td className="py-2">{it.specModel}</td><td className="py-2">{it.material || "-"}</td><td className="py-2">{it.dimensions || "-"}</td><td className="py-2 text-right">{Number(it.quantity).toLocaleString()}</td><td className="py-2">{it.unit}</td><td className="py-2 text-right">¥{Number(it.unitPrice).toLocaleString()}</td><td className="py-2 text-right font-medium">¥{Number(it.amount).toLocaleString()}</td><td className="py-2 text-right">{it.theoryWeight ? `${Number(it.theoryWeight).toFixed(3)}t` : "-"}</td><td className="py-2 text-right">{it.actualWeight ? `${Number(it.actualWeight).toFixed(3)}t` : "-"}</td></tr>
            ))}
          </tbody>
          <tfoot><tr className="font-semibold"><td colSpan={9} className="py-2 text-right">合计：</td><td className="py-2 text-right">¥{Number(quote.totalAmount || 0).toLocaleString()}</td></tr></tfoot>
        </table>
      </div>

      {/* 状态操作 */}
      {quote.status !== "WON" && quote.status !== "LOST" && (
        <div className="rounded-lg border border-slate-200 bg-white p-6">
          <h3 className="mb-3 font-medium text-slate-700">状态操作</h3>
          <div className="flex flex-wrap gap-2">
            {quote.status === "DRAFT" && <button onClick={() => handleStatusChange("SENT")} className="rounded-md bg-blue-100 px-3 py-1.5 text-sm text-blue-800 hover:bg-blue-200">标记为已发送</button>}
            {quote.status === "SENT" && <button onClick={() => handleStatusChange("NEGOTIATING")} className="rounded-md bg-yellow-100 px-3 py-1.5 text-sm text-yellow-800 hover:bg-yellow-200">进入谈判</button>}
            <button onClick={() => handleStatusChange("LOST")} className="rounded-md bg-red-50 px-3 py-1.5 text-sm text-red-700 hover:bg-red-100">标记丢失</button>
          </div>
        </div>
      )}
    </div>
  );
}
