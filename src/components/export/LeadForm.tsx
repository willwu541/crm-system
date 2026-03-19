"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  CUSTOMER_TYPES,
  INTERESTED_PRODUCTS,
  LEAD_STATUSES,
} from "@/lib/export-constants";

interface LeadFormProps {
  initial?: Record<string, unknown>;
  leadId?: string;
  /** 在抽屉模式下，保存成功后调用，不跳转 */
  onSuccess?: () => void;
  /** 在抽屉模式下，取消时调用 */
  onCancel?: () => void;
}

export function LeadForm({ initial, leadId, onSuccess, onCancel }: LeadFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    companyName: (initial?.companyName as string) ?? "",
    website: (initial?.website as string) ?? "",
    country: (initial?.country as string) ?? "",
    city: (initial?.city as string) ?? "",
    address: (initial?.address as string) ?? "",
    customerType: (initial?.customerType as string) ?? "",
    sourceChannel: (initial?.sourceChannel as string) ?? "",
    sourceKeyword: (initial?.sourceKeyword as string) ?? "",
    email: (initial?.email as string) ?? "",
    phone: (initial?.phone as string) ?? "",
    whatsapp: (initial?.whatsapp as string) ?? "",
    linkedin: (initial?.linkedin as string) ?? "",
    mainBusiness: (initial?.mainBusiness as string) ?? "",
    interestedProducts: (() => {
      const v = initial?.interestedProducts;
      if (Array.isArray(v)) return (v[0] as string) ?? "";
      return (v as string) ?? "";
    })(),
    priority: (initial?.priority as string) ?? "",
    status: (initial?.status as string) ?? "new",
    notes: (initial?.notes as string) ?? "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const url = leadId ? `/api/export/leads/${leadId}` : "/api/export/leads";
      const method = leadId ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "保存失败");
      if (onSuccess) {
        onSuccess();
        return;
      }
      if (leadId) {
        router.refresh();
        return;
      }
      router.push(`/export/leads/${json.data.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-4 rounded-lg border border-slate-200 bg-white p-6">
      {error && (
        <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="mb-1 block text-sm font-medium text-slate-700">公司名 *</label>
          <input
            type="text"
            value={form.companyName}
            onChange={(e) => setForm((f) => ({ ...f, companyName: e.target.value }))}
            required
            className="w-full rounded-md border border-slate-300 px-3 py-2"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">网站</label>
          <input
            type="text"
            value={form.website}
            onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))}
            className="w-full rounded-md border border-slate-300 px-3 py-2"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">国家</label>
          <input
            type="text"
            value={form.country}
            onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))}
            className="w-full rounded-md border border-slate-300 px-3 py-2"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">城市</label>
          <input
            type="text"
            value={form.city}
            onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
            className="w-full rounded-md border border-slate-300 px-3 py-2"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-sm font-medium text-slate-700">地址</label>
          <input
            type="text"
            value={form.address}
            onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
            className="w-full rounded-md border border-slate-300 px-3 py-2"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">客户类型</label>
          <select
            value={form.customerType}
            onChange={(e) => setForm((f) => ({ ...f, customerType: e.target.value }))}
            className="w-full rounded-md border border-slate-300 px-3 py-2"
          >
            <option value="">请选择</option>
            {CUSTOMER_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">来源渠道</label>
          <input
            type="text"
            value={form.sourceChannel}
            onChange={(e) => setForm((f) => ({ ...f, sourceChannel: e.target.value }))}
            className="w-full rounded-md border border-slate-300 px-3 py-2"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">来源关键词</label>
          <input
            type="text"
            value={form.sourceKeyword}
            onChange={(e) => setForm((f) => ({ ...f, sourceKeyword: e.target.value }))}
            className="w-full rounded-md border border-slate-300 px-3 py-2"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">邮箱</label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            className="w-full rounded-md border border-slate-300 px-3 py-2"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">电话</label>
          <input
            type="text"
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            className="w-full rounded-md border border-slate-300 px-3 py-2"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">WhatsApp</label>
          <input
            type="text"
            value={form.whatsapp}
            onChange={(e) => setForm((f) => ({ ...f, whatsapp: e.target.value }))}
            className="w-full rounded-md border border-slate-300 px-3 py-2"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">LinkedIn</label>
          <input
            type="text"
            value={form.linkedin}
            onChange={(e) => setForm((f) => ({ ...f, linkedin: e.target.value }))}
            className="w-full rounded-md border border-slate-300 px-3 py-2"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">主营</label>
          <input
            type="text"
            value={form.mainBusiness}
            onChange={(e) => setForm((f) => ({ ...f, mainBusiness: e.target.value }))}
            className="w-full rounded-md border border-slate-300 px-3 py-2"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">感兴趣产品</label>
          <select
            value={form.interestedProducts}
            onChange={(e) => setForm((f) => ({ ...f, interestedProducts: e.target.value }))}
            className="w-full rounded-md border border-slate-300 px-3 py-2"
          >
            <option value="">请选择</option>
            {INTERESTED_PRODUCTS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">优先级</label>
          <input
            type="text"
            value={form.priority}
            onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
            className="w-full rounded-md border border-slate-300 px-3 py-2"
          />
        </div>
        {leadId && (
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">状态</label>
            <select
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
              className="w-full rounded-md border border-slate-300 px-3 py-2"
            >
              {LEAD_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
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
          rows={3}
          className="w-full rounded-md border border-slate-300 px-3 py-2"
        />
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
        >
          {loading ? "保存中..." : "保存"}
        </button>
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50"
          >
            取消
          </button>
        ) : (
          <Link
            href={leadId ? `/export/leads/${leadId}` : "/export/leads"}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50"
          >
            取消
          </Link>
        )}
      </div>
    </form>
  );
}
