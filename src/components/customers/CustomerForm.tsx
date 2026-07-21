"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function CustomerForm({
  mode,
  customerId,
  initial,
}: {
  mode: "create" | "edit";
  customerId?: string;
  initial?: Record<string, string | null>;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: initial?.name ?? "",
    contactName: initial?.contactName ?? "",
    contactPhone: initial?.contactPhone ?? "",
    wechat: initial?.wechat ?? "",
    region: initial?.region ?? "",
    source: initial?.source ?? "",
    remark: initial?.remark ?? "",
    nextFollowUpAt: initial?.nextFollowUpAt
      ? new Date(initial.nextFollowUpAt).toISOString().slice(0, 10)
      : "",
  });

  function update(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const url = mode === "create" ? "/api/customers" : `/api/customers/${customerId}`;
      const method = mode === "create" ? "POST" : "PATCH";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          nextFollowUpAt: form.nextFollowUpAt || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "保存失败");
        return;
      }
      router.push(`/customers/${json.data.id}`);
      router.refresh();
    } catch {
      setError("网络错误，请重试");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-xl space-y-4 rounded-lg border border-slate-200 bg-white p-6">
      {error && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      {[
        { key: "name", label: "客户名称", required: true },
        { key: "contactName", label: "联系人", required: true },
        { key: "contactPhone", label: "联系电话", required: true },
        { key: "wechat", label: "微信号" },
        { key: "region", label: "地区" },
        { key: "source", label: "来源渠道" },
      ].map(({ key, label, required }) => (
        <div key={key}>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            {label}
            {required && <span className="text-red-500"> *</span>}
          </label>
          <input
            required={required}
            value={form[key as keyof typeof form]}
            onChange={(e) => update(key, e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
      ))}
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">下次跟进日期</label>
        <input
          type="date"
          value={form.nextFollowUpAt}
          onChange={(e) => update("nextFollowUpAt", e.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">备注</label>
        <textarea
          value={form.remark}
          onChange={(e) => update("remark", e.target.value)}
          rows={3}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="rounded-md bg-teal-600 px-4 py-2 text-sm text-white hover:bg-teal-700 disabled:opacity-50"
      >
        {loading ? "保存中..." : mode === "create" ? "创建客户" : "保存修改"}
      </button>
    </form>
  );
}
