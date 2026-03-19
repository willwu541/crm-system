"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ACTIVITY_TYPES } from "@/lib/export-constants";

export function ActivityFormClient({
  customerId,
  contactId,
  onSuccess,
  onCancel,
}: {
  customerId: string;
  contactId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [contacts, setContacts] = useState<{ id: string; name: string }[]>([]);
  const [form, setForm] = useState({
    contactId: contactId ?? "",
    type: "email",
    subject: "",
    content: "",
    customerFeedback: "",
    nextFollowUpAt: "",
  });

  useEffect(() => {
    fetch(`/api/export/contacts?customerId=${customerId}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.data) setContacts(json.data);
      });
  }, [customerId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/export/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId,
          contactId: form.contactId || undefined,
          type: form.type,
          subject: form.subject || undefined,
          content: form.content || undefined,
          customerFeedback: form.customerFeedback || undefined,
          nextFollowUpAt: form.nextFollowUpAt ? new Date(form.nextFollowUpAt).toISOString() : undefined,
        }),
      });
      const json = await res.json();
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
          <label className="mb-1 block text-sm font-medium text-slate-700">类型 *</label>
          <select
            value={form.type}
            onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
            required
            className="w-full rounded-md border border-slate-300 px-3 py-2"
          >
            {ACTIVITY_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
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
        <div className="sm:col-span-2">
          <label className="mb-1 block text-sm font-medium text-slate-700">主题</label>
          <input
            type="text"
            value={form.subject}
            onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
            className="w-full rounded-md border border-slate-300 px-3 py-2"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-sm font-medium text-slate-700">内容</label>
          <textarea
            value={form.content}
            onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
            rows={4}
            className="w-full rounded-md border border-slate-300 px-3 py-2"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-sm font-medium text-slate-700">客户反馈</label>
          <textarea
            value={form.customerFeedback}
            onChange={(e) => setForm((f) => ({ ...f, customerFeedback: e.target.value }))}
            rows={2}
            className="w-full rounded-md border border-slate-300 px-3 py-2"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">下次跟进</label>
          <input
            type="datetime-local"
            value={form.nextFollowUpAt}
            onChange={(e) => setForm((f) => ({ ...f, nextFollowUpAt: e.target.value }))}
            className="w-full rounded-md border border-slate-300 px-3 py-2"
          />
        </div>
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
