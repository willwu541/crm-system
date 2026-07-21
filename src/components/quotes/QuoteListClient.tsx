"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useToast } from "@/components/ui/Toast";
import { parseResponseJson } from "@/lib/parse-response-json";

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "草稿", SENT: "已发送", NEGOTIATING: "谈判中", WON: "已成交", LOST: "已丢失",
};
const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-600", SENT: "bg-blue-100 text-blue-700",
  NEGOTIATING: "bg-yellow-100 text-yellow-700", WON: "bg-emerald-100 text-emerald-700",
  LOST: "bg-red-100 text-red-700",
};

interface QuoteItem { id: string; productType: string; specModel: string; material?: string; dimensions?: string; quantity: number; unit: string; unitPrice: number; amount: number; }
interface Quote { id: string; quoteNo: string; contactName: string; contactPhone: string; projectName?: string; totalAmount?: number; status: string; createdAt: string; customer: { id: string; name: string }; createdBy: { id: string; name: string }; items: QuoteItem[]; wonOrder?: { id: string; orderNo: string } | null; }

export function QuoteListClient() {
  const { toast } = useToast();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 20;

  async function fetchQuotes() {
    setLoading(true);
    try {
      const params = new URLSearchParams(); params.set("page", String(page)); params.set("pageSize", String(pageSize));
      const res = await fetch(`/api/customer-quotes?${params}`);
      const json = await parseResponseJson<{ data: Quote[]; pagination: { total: number } }>(res);
      if (res.ok) { setQuotes(json.data || []); setTotal(json.pagination?.total || 0); }
    } finally { setLoading(false); }
  }

  useEffect(() => { fetchQuotes(); }, [page]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Link href="/quotes/new" className="rounded-md bg-teal-600 px-4 py-2 text-sm text-white hover:bg-teal-700">新建报价</Link>
      </div>
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        {loading ? <div className="p-8 text-center text-slate-500">加载中...</div> : quotes.length === 0 ? <div className="p-8 text-center text-slate-500">暂无报价</div> : (
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr><th className="px-4 py-3 text-left font-medium text-slate-700">报价单号</th><th className="px-4 py-3 text-left font-medium text-slate-700">客户</th><th className="px-4 py-3 text-left font-medium text-slate-700">联系人</th><th className="px-4 py-3 text-left font-medium text-slate-700">总金额</th><th className="px-4 py-3 text-left font-medium text-slate-700">状态</th><th className="px-4 py-3 text-left font-medium text-slate-700">时间</th><th className="px-4 py-3 text-left font-medium text-slate-700">操作</th></tr>
            </thead>
            <tbody>
              {quotes.map((q) => (
                <tr key={q.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium">{q.quoteNo}</td>
                  <td className="px-4 py-3">{q.customer?.name}</td>
                  <td className="px-4 py-3">{q.contactName}</td>
                  <td className="px-4 py-3">¥{q.totalAmount ? Number(q.totalAmount).toLocaleString() : "-"}</td>
                  <td className="px-4 py-3"><span className={`rounded px-2 py-0.5 text-xs ${STATUS_COLORS[q.status]}`}>{STATUS_LABELS[q.status]}</span></td>
                  <td className="px-4 py-3 text-slate-500">{new Date(q.createdAt).toLocaleDateString("zh-CN")}</td>
                  <td className="px-4 py-3"><Link href={`/quotes/${q.id}`} className="text-teal-700 hover:underline text-sm">查看</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-md border px-3 py-1 text-sm disabled:opacity-50">上一页</button>
          <span className="text-sm text-slate-600">第 {page}/{totalPages} 页</span>
          <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="rounded-md border px-3 py-1 text-sm disabled:opacity-50">下一页</button>
        </div>
      )}
    </div>
  );
}
