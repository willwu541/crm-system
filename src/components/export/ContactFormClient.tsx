"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { parseResponseJson } from "@/lib/parse-response-json";

export function ContactFormClient({
  customerId,
  initial,
  contactId,
  onSuccess,
  onCancel,
}: {
  customerId: string;
  initial?: Record<string, unknown>;
  contactId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: (initial?.name as string) ?? "",
    title: (initial?.title as string) ?? "",
    email: (initial?.email as string) ?? "",
    phone: (initial?.phone as string) ?? "",
    whatsapp: (initial?.whatsapp as string) ?? "",
    linkedin: (initial?.linkedin as string) ?? "",
    facebook: (initial?.facebook as string) ?? "",
    tiktok: (initial?.tiktok as string) ?? "",
    language: (initial?.language as string) ?? "",
    isPrimary: (initial?.isPrimary as boolean) ?? false,
    notes: (initial?.notes as string) ?? "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const url = contactId ? `/api/export/contacts/${contactId}` : "/api/export/contacts";
      const method = contactId ? "PATCH" : "POST";
      const body = contactId ? form : { ...form, customerId };
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await parseResponseJson<{ error?: string }>(res);
      if (!res.ok) throw new Error(json.error ?? "保存失败");
      if (onSuccess) {
        onSuccess();
        return;
      }
      router.push(`/export/customers/${customerId}`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-xl space-y-4 rounded-lg border border-slate-200 bg-white p-6">
      {error && (
        <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">姓名 *</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            required
            className="w-full rounded-md border border-slate-300 px-3 py-2"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">职位</label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
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
          <label className="mb-1 block text-sm font-medium text-slate-700">Facebook</label>
          <input
            type="text"
            value={form.facebook}
            onChange={(e) => setForm((f) => ({ ...f, facebook: e.target.value }))}
            className="w-full rounded-md border border-slate-300 px-3 py-2"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">TikTok</label>
          <input
            type="text"
            value={form.tiktok}
            onChange={(e) => setForm((f) => ({ ...f, tiktok: e.target.value }))}
            className="w-full rounded-md border border-slate-300 px-3 py-2"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">语言</label>
          <input
            type="text"
            value={form.language}
            onChange={(e) => setForm((f) => ({ ...f, language: e.target.value }))}
            className="w-full rounded-md border border-slate-300 px-3 py-2"
          />
        </div>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="isPrimary"
            checked={form.isPrimary}
            onChange={(e) => setForm((f) => ({ ...f, isPrimary: e.target.checked }))}
            className="rounded border-slate-300"
          />
          <label htmlFor="isPrimary" className="text-sm text-slate-700">主联系人</label>
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
            href={`/export/customers/${customerId}`}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50"
          >
            取消
          </Link>
        )}
      </div>
    </form>
  );
}
