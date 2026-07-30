"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  CUSTOMER_TYPES,
  INTERESTED_PRODUCTS,
  MARKET_PRIORITY,
  VALUE_LEVEL,
  CUSTOMER_STATUSES,
  LEAD_SOURCE_CHANNELS,
} from "@/lib/export-constants";
import { parseResponseJson } from "@/lib/parse-response-json";
import { normalizeWebsiteUrl } from "@/lib/website";
import {
  customerTypeLabel,
  interestedProductLabel,
  marketPriorityLabel,
  valueLevelLabel,
  customerStatusLabel,
} from "@/lib/export-display-labels";

interface CustomerFormProps {
  initial?: Record<string, unknown>;
  customerId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function CustomerForm({ initial, customerId, onSuccess, onCancel }: CustomerFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [form, setForm] = useState({
    companyName: (initial?.companyName as string) ?? "",
    customerCode: (initial?.customerCode as string) ?? "",
    website: (initial?.website as string) ?? "",
    country: (initial?.country as string) ?? "",
    city: (initial?.city as string) ?? "",
    address: (initial?.address as string) ?? "",
    customerType: (initial?.customerType as string) ?? "",
    industry: (initial?.industry as string) ?? "",
    marketPriority: (initial?.marketPriority as string) ?? "",
    valueLevel: (initial?.valueLevel as string) ?? "",
    interestedProducts: (() => {
      const v = initial?.interestedProducts;
      if (Array.isArray(v)) return (v[0] as string) ?? "";
      return (v as string) ?? "";
    })(),
    sourceChannel: (initial?.sourceChannel as string) ?? "",
    status: (initial?.status as string) ?? "to_develop",
    notes: (initial?.notes as string) ?? "",
  });
  const websitePreviewUrl = normalizeWebsiteUrl(form.website);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const url = customerId ? `/api/export/customers/${customerId}` : "/api/export/customers";
      const method = customerId ? "PATCH" : "POST";
      const payload = customerId ? { ...form, customerCode: undefined } : form;
      payload.website = normalizeWebsiteUrl(payload.website) ?? "";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await parseResponseJson<{ error?: string; data?: { id: string } }>(res);
      if (!res.ok) throw new Error(json.error ?? "保存失败");
      const createdCustomerId = json.data?.id;
      if (!customerId && createdCustomerId && files.length > 0) {
        for (const file of files) {
          const fd = new FormData();
          fd.append("file", file);
          fd.append("entityType", "export_customer");
          fd.append("entityId", createdCustomerId);
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
      if (customerId) {
        router.refresh();
        return;
      }
      if (json.data?.id) router.push(`/export/customers/${json.data.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="export-card export-detail-group max-w-2xl space-y-5 p-7">
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
        {!customerId && (
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">客户编号</label>
            <input
              type="text"
              value={form.customerCode}
              onChange={(e) => setForm((f) => ({ ...f, customerCode: e.target.value }))}
              placeholder="留空自动生成"
              className="w-full rounded-md border border-slate-300 px-3 py-2"
            />
          </div>
        )}
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">网站</label>
          <input
            type="url"
            value={form.website}
            onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))}
            placeholder="https://example.com"
            className="w-full rounded-md border border-slate-300 px-3 py-2"
          />
          {websitePreviewUrl && (
            <a
              href={websitePreviewUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-1 inline-block text-xs text-teal-600 hover:underline"
            >
              打开官网
            </a>
          )}
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
                {customerTypeLabel[t] ?? t}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">行业</label>
          <input
            type="text"
            value={form.industry}
            onChange={(e) => setForm((f) => ({ ...f, industry: e.target.value }))}
            className="w-full rounded-md border border-slate-300 px-3 py-2"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">市场优先级</label>
          <select
            value={form.marketPriority}
            onChange={(e) => setForm((f) => ({ ...f, marketPriority: e.target.value }))}
            className="w-full rounded-md border border-slate-300 px-3 py-2"
          >
            <option value="">请选择</option>
            {MARKET_PRIORITY.map((p) => (
              <option key={p} value={p}>
                {marketPriorityLabel[p] ?? p}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">价值等级</label>
          <select
            value={form.valueLevel}
            onChange={(e) => setForm((f) => ({ ...f, valueLevel: e.target.value }))}
            className="w-full rounded-md border border-slate-300 px-3 py-2"
          >
            <option value="">请选择</option>
            {VALUE_LEVEL.map((v) => (
              <option key={v} value={v}>
                {valueLevelLabel[v] ?? v}
              </option>
            ))}
          </select>
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
                {interestedProductLabel[p] ?? p}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">来源渠道</label>
          <input
            list="customer-source-channel-options"
            type="text"
            value={form.sourceChannel}
            onChange={(e) => setForm((f) => ({ ...f, sourceChannel: e.target.value }))}
            placeholder="选择或输入"
            className="w-full rounded-md border border-slate-300 px-3 py-2"
          />
          <datalist id="customer-source-channel-options">
            {LEAD_SOURCE_CHANNELS.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">状态</label>
          <select
            value={form.status}
            onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
            className="w-full rounded-md border border-slate-300 px-3 py-2"
          >
            {CUSTOMER_STATUSES.map((s) => (
              <option key={s} value={s}>
                {customerStatusLabel[s] ?? s}
              </option>
            ))}
          </select>
        </div>
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
            href={customerId ? `/export/customers/${customerId}` : "/export/customers"}
            className="export-btn-secondary rounded-md px-4 py-2 text-sm"
          >
            取消
          </Link>
        )}
      </div>
    </form>
  );
}
