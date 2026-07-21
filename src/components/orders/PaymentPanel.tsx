"use client";

import { useState, useEffect } from "react";
import { useToast } from "@/components/ui/Toast";
import { parseResponseJson } from "@/lib/parse-response-json";

interface Payment {
  id: string;
  amount: number;
  paymentDate: string;
  method: string;
  remark?: string;
  recordedBy: { id: string; name: string };
}

const METHOD_LABELS: Record<string, string> = {
  BANK: "银行转账", CASH: "现金", WECHAT: "微信", ALIPAY: "支付宝", OTHER: "其他",
};

export function PaymentPanel({ orderId }: { orderId: string }) {
  const { toast } = useToast();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [total, setTotal] = useState(0);
  const [paid, setPaid] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [method, setMethod] = useState("BANK");
  const [remark, setRemark] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/orders/${orderId}/payments`);
      const json = await parseResponseJson<{ data: Payment[]; total: number; paid: number }>(res);
      if (res.ok) {
        setPayments(json.data || []);
        setTotal(Number(json.total || 0));
        setPaid(Number(json.paid || 0));
      }
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [orderId]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) { toast("请输入有效金额"); return; }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/orders/${orderId}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: amt, paymentDate: date, method, remark: remark || undefined }),
      });
      const json = await parseResponseJson<{ error?: string }>(res);
      if (!res.ok) throw new Error(json.error ?? "记录失败");
      toast(`已记录回款 ¥${amt.toLocaleString()}`);
      setShowForm(false); setAmount(""); setRemark("");
      load();
    } catch (e) {
      toast(e instanceof Error ? e.message : "记录失败");
    } finally { setSubmitting(false); }
  }

  const unpaid = total - paid;
  const paidPct = total > 0 ? Math.min(100, (paid / total) * 100) : 0;

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-medium text-slate-800">回款管理</h2>
        <button onClick={() => setShowForm(!showForm)} className="rounded-md bg-teal-600 px-3 py-1.5 text-sm text-white hover:bg-teal-700">
          {showForm ? "取消" : "+ 记一回款"}
        </button>
      </div>

      {/* 进度条 */}
      {total > 0 && (
        <div className="mb-4">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-slate-600">已收 ¥{paid.toLocaleString()} / 共 ¥{total.toLocaleString()}</span>
            <span className={unpaid <= 0 ? "text-emerald-600 font-medium" : "text-amber-600 font-medium"}>
              {unpaid <= 0 ? "已结清" : `未收 ¥${unpaid.toLocaleString()}`}
            </span>
          </div>
          <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 transition-all" style={{ width: `${paidPct}%` }} />
          </div>
        </div>
      )}

      {showForm && (
        <form onSubmit={handleAdd} className="mb-4 rounded-lg border border-teal-200 bg-teal-50/30 p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div>
              <label className="mb-1 block text-xs text-slate-500">金额(¥) *</label>
              <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} required min="0" step="0.01" className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-500">日期</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-500">方式</label>
              <select value={method} onChange={(e) => setMethod(e.target.value)} className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm">
                <option value="BANK">银行转账</option>
                <option value="WECHAT">微信</option>
                <option value="ALIPAY">支付宝</option>
                <option value="CASH">现金</option>
                <option value="OTHER">其他</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-500">备注</label>
              <input type="text" value={remark} onChange={(e) => setRemark(e.target.value)} className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm" />
            </div>
          </div>
          <button type="submit" disabled={submitting} className="rounded-md bg-teal-600 px-4 py-1.5 text-sm text-white hover:bg-teal-700 disabled:opacity-50">
            {submitting ? "保存中" : "保存"}
          </button>
        </form>
      )}

      {loading ? <div className="text-xs text-slate-400">加载中...</div> : payments.length === 0 ? (
        <p className="text-sm text-slate-400">暂无回款记录</p>
      ) : (
        <div className="divide-y divide-slate-100">
          {payments.map(p => (
            <div key={p.id} className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-emerald-700">¥{Number(p.amount).toLocaleString()}</span>
                <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600">{METHOD_LABELS[p.method] || p.method}</span>
                {p.remark && <span className="text-xs text-slate-500">{p.remark}</span>}
              </div>
              <div className="text-xs text-slate-400">
                {new Date(p.paymentDate).toLocaleDateString("zh-CN")} · {p.recordedBy.name}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
