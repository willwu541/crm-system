"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CUSTOMER_TYPES, LEAD_STATUSES } from "@/lib/export-constants";
import { customerTypeLabel, leadStatusLabel } from "@/lib/export-display-labels";
import type { SessionUser } from "@/lib/auth";
import { parseResponseJson } from "@/lib/parse-response-json";
import { normalizeWebsiteUrl } from "@/lib/website";

interface LeadFormProps {
  initial?: Record<string, unknown>;
  leadId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

interface ExportUser {
  id: string;
  name: string;
  email: string;
}

export function LeadForm({ initial, leadId, onSuccess, onCancel }: LeadFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [me, setMe] = useState<SessionUser | null>(null);
  const [users, setUsers] = useState<ExportUser[]>([]);

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
    productInterest: (() => {
      const v = initial?.productInterest;
      if (typeof v === "string") return v;
      const legacy = initial?.interestedProducts;
      if (Array.isArray(legacy)) return legacy.filter(Boolean).join(", ");
      return "";
    })(),
    priority: (initial?.priority as string) ?? "",
    status: (initial?.status as string) ?? "new",
    notes: (initial?.notes as string) ?? "",
    ownerId: (initial?.owner as { id?: string })?.id ?? (initial?.ownerId as string) ?? "",
  });
  const websitePreviewUrl = normalizeWebsiteUrl(form.website);

  useEffect(() => {
    if (initial?.owner && typeof initial.owner === "object" && "id" in (initial.owner as object)) {
      setForm((f) => ({ ...f, ownerId: String((initial.owner as { id: string }).id) }));
    }
  }, [initial]);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/auth/me");
        const j = await parseResponseJson<{ user?: SessionUser }>(r);
        if (j.user) setMe(j.user);
      } catch {
        /* ignore */
      }
    })();
    (async () => {
      try {
        const r = await fetch("/api/export/users");
        const j = await parseResponseJson<{ data?: ExportUser[] }>(r);
        if (j.data) setUsers(j.data);
      } catch {
        /* ignore */
      }
    })();
  }, []);

  const isAdmin = me?.role === "ADMIN";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const url = leadId ? `/api/export/leads/${leadId}` : "/api/export/leads";
      const method = leadId ? "PATCH" : "POST";
      const body: Record<string, unknown> = {
        companyName: form.companyName,
        website: normalizeWebsiteUrl(form.website) || undefined,
        country: form.country || undefined,
        city: form.city || undefined,
        address: form.address || undefined,
        customerType: form.customerType || undefined,
        sourceChannel: form.sourceChannel || undefined,
        sourceKeyword: form.sourceKeyword || undefined,
        email: form.email || undefined,
        phone: form.phone || undefined,
        whatsapp: form.whatsapp || undefined,
        linkedin: form.linkedin || undefined,
        mainBusiness: form.mainBusiness || undefined,
        productInterest: form.productInterest || undefined,
        priority: form.priority || undefined,
        status: form.status,
        notes: form.notes || undefined,
      };
      if (isAdmin && form.ownerId) {
        body.ownerId = form.ownerId;
      }
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await parseResponseJson<{ error?: string; data?: { id: string } }>(res);
      if (!res.ok) throw new Error(json.error ?? "保存失败");
      if (onSuccess) {
        onSuccess();
        return;
      }
      if (leadId) {
        router.refresh();
        return;
      }
      if (json.data?.id) router.push(`/export/leads/${json.data.id}`);
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
        {isAdmin && users.length > 0 && (
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium text-slate-700">负责人（业务员）</label>
            <select
              value={form.ownerId}
              onChange={(e) => setForm((f) => ({ ...f, ownerId: e.target.value }))}
              className="w-full rounded-md border border-slate-300 px-3 py-2"
            >
              <option value="">默认（自己）</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.email})
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-slate-500">管理员可将线索分配给外贸业务员跟进</p>
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
        <div className="sm:col-span-2">
          <label className="mb-1 block text-sm font-medium text-slate-700">感兴趣产品 / 需求说明</label>
          <textarea
            value={form.productInterest}
            onChange={(e) => setForm((f) => ({ ...f, productInterest: e.target.value }))}
            rows={3}
            placeholder="可自由填写，如：钢格板、踏步板等"
            className="w-full rounded-md border border-slate-300 px-3 py-2"
          />
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
                  {leadStatusLabel[s] ?? s}
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
