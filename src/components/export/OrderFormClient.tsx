"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { PAYMENT_STATUSES, PRODUCTION_STATUSES, SHIPPING_STATUSES } from "@/lib/export-constants";
import { parseResponseJson } from "@/lib/parse-response-json";
import { paymentStatusLabel, productionStatusLabel, shippingStatusLabel } from "@/lib/export-display-labels";

export function OrderFormClient({
  orderId,
  initial,
  customerId: customerIdProp,
  onSuccess,
  onCancel,
}: {
  orderId?: string;
  initial?: Record<string, unknown>;
  customerId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const customerIdParam = customerIdProp ?? searchParams.get("customerId");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [customers, setCustomers] = useState<{ id: string; companyName: string }[]>([]);
  const [quotes, setQuotes] = useState<{ id: string; quoteNo: string }[]>([]);
  const [form, setForm] = useState({
    customerId: (initial?.customerId as string) ?? customerIdParam ?? "",
    quoteId: (initial?.quoteId as string) ?? "",
    orderDate: (initial?.orderDate ? new Date(initial.orderDate as string).toISOString().slice(0, 10) : "") || new Date().toISOString().slice(0, 10),
    currency: (initial?.currency as string) ?? "USD",
    totalAmount: initial?.totalAmount != null ? String(initial.totalAmount) : "",
    paymentTerm: (initial?.paymentTerm as string) ?? "",
    paymentStatus: (initial?.paymentStatus as string) ?? "unpaid",
    productionStatus: (initial?.productionStatus as string) ?? "pending",
    shippingStatus: (initial?.shippingStatus as string) ?? "pending",
    eta: (initial?.eta ? new Date(initial.eta as string).toISOString().slice(0, 10) : "") ?? "",
    notes: (initial?.notes as string) ?? "",
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch("/api/export/customers?pageSize=500");
        const json = await parseResponseJson<{ data?: { id: string; companyName: string }[] }>(r);
        if (!cancelled && json.data) setCustomers(json.data);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (form.customerId) {
      (async () => {
        try {
          const r = await fetch(`/api/export/quotes?customerId=${form.customerId}&pageSize=100`);
          const json = await parseResponseJson<{ data?: { id: string; quoteNo: string }[] }>(r);
          if (!cancelled && json.data) setQuotes(json.data);
        } catch {
          if (!cancelled) setQuotes([]);
        }
      })();
    } else {
      setQuotes([]);
    }
    return () => {
      cancelled = true;
    };
  }, [form.customerId]);

  useEffect(() => {
    if (customerIdParam && !form.customerId) setForm((f) => ({ ...f, customerId: customerIdParam }));
  }, [customerIdParam]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const url = orderId ? `/api/export/orders/${orderId}` : "/api/export/orders";
      const method = orderId ? "PATCH" : "POST";
      const payload = {
        ...form,
        totalAmount: form.totalAmount ? Number(form.totalAmount) : undefined,
        eta: form.eta || undefined,
      };
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await parseResponseJson<{ error?: string; data?: { id: string } }>(res);
      if (!res.ok) throw new Error(json.error ?? "保存失败");
      const createdOrderId = json.data?.id;
      if (!orderId && createdOrderId && files.length > 0) {
        for (const file of files) {
          const fd = new FormData();
          fd.append("file", file);
          fd.append("entityType", "export_order");
          fd.append("entityId", createdOrderId);
          const uploadRes = await fetch("/api/upload", { method: "POST", body: fd });
          if (!uploadRes.ok) {
            const uploadJson = await parseResponseJson<{ error?: string }>(uploadRes);
            throw new Error(uploadJson.error ?? "附件上传失败");
          }
        }
      }
      if (onSuccess) {
        onSuccess();
        return;
      }
      if (orderId) {
        router.refresh();
        return;
      }
      if (json.data?.id) router.push(`/export/orders/${json.data.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="export-card export-detail-group max-w-2xl space-y-5 p-7">
      <h1 className="text-xl font-semibold text-slate-800">{orderId ? "编辑订单" : "新建订单"}</h1>
      {error && (
        <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="mb-1 block text-sm font-medium text-slate-700">客户 *</label>
          <select
            value={form.customerId}
            onChange={(e) => setForm((f) => ({ ...f, customerId: e.target.value, quoteId: "" }))}
            required
            className="w-full rounded-md border border-slate-300 px-3 py-2"
          >
            <option value="">请选择</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.companyName}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">关联报价</label>
          <select
            value={form.quoteId}
            onChange={(e) => setForm((f) => ({ ...f, quoteId: e.target.value }))}
            className="w-full rounded-md border border-slate-300 px-3 py-2"
          >
            <option value="">无</option>
            {quotes.map((q) => (
              <option key={q.id} value={q.id}>
                {q.quoteNo}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">订单日期</label>
          <input
            type="date"
            value={form.orderDate}
            onChange={(e) => setForm((f) => ({ ...f, orderDate: e.target.value }))}
            className="w-full rounded-md border border-slate-300 px-3 py-2"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">币种</label>
          <input
            type="text"
            value={form.currency}
            onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}
            className="w-full rounded-md border border-slate-300 px-3 py-2"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">总金额</label>
          <input
            type="number"
            step="0.01"
            value={form.totalAmount}
            onChange={(e) => setForm((f) => ({ ...f, totalAmount: e.target.value }))}
            className="w-full rounded-md border border-slate-300 px-3 py-2"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">付款条款</label>
          <input
            type="text"
            value={form.paymentTerm}
            onChange={(e) => setForm((f) => ({ ...f, paymentTerm: e.target.value }))}
            className="w-full rounded-md border border-slate-300 px-3 py-2"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">付款状态</label>
          <select
            value={form.paymentStatus}
            onChange={(e) => setForm((f) => ({ ...f, paymentStatus: e.target.value }))}
            className="w-full rounded-md border border-slate-300 px-3 py-2"
          >
            {PAYMENT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {paymentStatusLabel[s] ?? s}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">生产状态</label>
          <select
            value={form.productionStatus}
            onChange={(e) => setForm((f) => ({ ...f, productionStatus: e.target.value }))}
            className="w-full rounded-md border border-slate-300 px-3 py-2"
          >
            {PRODUCTION_STATUSES.map((s) => (
              <option key={s} value={s}>
                {productionStatusLabel[s] ?? s}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">发货状态</label>
          <select
            value={form.shippingStatus}
            onChange={(e) => setForm((f) => ({ ...f, shippingStatus: e.target.value }))}
            className="w-full rounded-md border border-slate-300 px-3 py-2"
          >
            {SHIPPING_STATUSES.map((s) => (
              <option key={s} value={s}>
                {shippingStatusLabel[s] ?? s}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">预计到港 ETA</label>
          <input
            type="date"
            value={form.eta}
            onChange={(e) => setForm((f) => ({ ...f, eta: e.target.value }))}
            className="w-full rounded-md border border-slate-300 px-3 py-2"
          />
        </div>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">备注</label>
        <textarea
          value={form.notes}
          onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          rows={2}
          className="w-full rounded-md border border-slate-300 px-3 py-2"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">附件（可选）</label>
        <input
          type="file"
          multiple
          accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,image/*"
          onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        {files.length > 0 && (
          <p className="mt-1 text-xs text-slate-500">已选择 {files.length} 个文件，保存后自动上传。</p>
        )}
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={loading}
          className="export-btn-primary rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          {loading ? "保存中..." : "保存"}
        </button>
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="export-btn-secondary rounded-md px-4 py-2 text-sm"
          >
            取消
          </button>
        ) : (
          <Link
            href={orderId ? `/export/orders/${orderId}` : "/export/orders"}
            className="export-btn-secondary rounded-md px-4 py-2 text-sm"
          >
            取消
          </Link>
        )}
      </div>
    </form>
  );
}
