"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { QUOTE_STATUSES } from "@/lib/export-constants";
import { parseResponseJson } from "@/lib/parse-response-json";
import { quoteStatusLabel } from "@/lib/export-display-labels";

export function QuoteFormClient({
  quoteId,
  initial,
  customerId: customerIdProp,
  onSuccess,
  onCancel,
}: {
  quoteId?: string;
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
  const [contacts, setContacts] = useState<{ id: string; name: string }[]>([]);
  const [form, setForm] = useState({
    customerId: (initial?.customerId as string) ?? customerIdParam ?? "",
    contactId: (initial?.contactId as string) ?? "",
    quoteDate: (initial?.quoteDate ? new Date(initial.quoteDate as string).toISOString().slice(0, 10) : "") || new Date().toISOString().slice(0, 10),
    currency: (initial?.currency as string) ?? "USD",
    incoterm: (initial?.incoterm as string) ?? "",
    validityDate: (initial?.validityDate ? new Date(initial.validityDate as string).toISOString().slice(0, 10) : "") ?? "",
    productSummary: (initial?.productSummary as string) ?? "",
    totalAmount: initial?.totalAmount != null ? String(initial.totalAmount) : "",
    status: (initial?.status as string) ?? "draft",
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
          const r = await fetch(`/api/export/contacts?customerId=${form.customerId}`);
          const json = await parseResponseJson<{ data?: { id: string; name: string }[] }>(r);
          if (!cancelled && json.data) setContacts(json.data);
        } catch {
          if (!cancelled) setContacts([]);
        }
      })();
    } else {
      setContacts([]);
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
      const url = quoteId ? `/api/export/quotes/${quoteId}` : "/api/export/quotes";
      const method = quoteId ? "PATCH" : "POST";
      const payload = {
        ...form,
        totalAmount: form.totalAmount ? Number(form.totalAmount) : undefined,
        validityDate: form.validityDate || undefined,
      };
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await parseResponseJson<{ error?: string; data?: { id: string } }>(res);
      if (!res.ok) throw new Error(json.error ?? "保存失败");
      const createdQuoteId = json.data?.id;
      if (!quoteId && createdQuoteId && files.length > 0) {
        for (const file of files) {
          const fd = new FormData();
          fd.append("file", file);
          fd.append("entityType", "export_quote");
          fd.append("entityId", createdQuoteId);
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
      if (quoteId) {
        router.refresh();
        return;
      }
      if (json.data?.id) router.push(`/export/quotes/${json.data.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="export-card max-w-2xl space-y-4 p-6">
      <h1 className="text-xl font-semibold text-slate-800">{quoteId ? "编辑报价" : "新建报价"}</h1>
      {error && (
        <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="mb-1 block text-sm font-medium text-slate-700">客户 *</label>
          <select
            value={form.customerId}
            onChange={(e) => setForm((f) => ({ ...f, customerId: e.target.value, contactId: "" }))}
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
          <label className="mb-1 block text-sm font-medium text-slate-700">联系人</label>
          <select
            value={form.contactId}
            onChange={(e) => setForm((f) => ({ ...f, contactId: e.target.value }))}
            className="w-full rounded-md border border-slate-300 px-3 py-2"
          >
            <option value="">无</option>
            {contacts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">报价日期</label>
          <input
            type="date"
            value={form.quoteDate}
            onChange={(e) => setForm((f) => ({ ...f, quoteDate: e.target.value }))}
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
          <label className="mb-1 block text-sm font-medium text-slate-700">Incoterm</label>
          <input
            type="text"
            value={form.incoterm}
            onChange={(e) => setForm((f) => ({ ...f, incoterm: e.target.value }))}
            placeholder="FOB, CIF, etc."
            className="w-full rounded-md border border-slate-300 px-3 py-2"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">有效期</label>
          <input
            type="date"
            value={form.validityDate}
            onChange={(e) => setForm((f) => ({ ...f, validityDate: e.target.value }))}
            className="w-full rounded-md border border-slate-300 px-3 py-2"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-sm font-medium text-slate-700">产品摘要</label>
          <textarea
            value={form.productSummary}
            onChange={(e) => setForm((f) => ({ ...f, productSummary: e.target.value }))}
            rows={3}
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
        {quoteId && (
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">状态</label>
            <select
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
              className="w-full rounded-md border border-slate-300 px-3 py-2"
            >
              {QUOTE_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {quoteStatusLabel[s] ?? s}
                </option>
              ))}
            </select>
          </div>
        )}
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
            href={quoteId ? `/export/quotes/${quoteId}` : "/export/quotes"}
            className="export-btn-secondary rounded-md px-4 py-2 text-sm"
          >
            取消
          </Link>
        )}
      </div>
    </form>
  );
}
