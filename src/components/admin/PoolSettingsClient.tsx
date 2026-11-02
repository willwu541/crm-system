"use client";

import { useState, useEffect } from "react";
import { useToast } from "@/components/ui/Toast";
import { parseResponseJson } from "@/lib/parse-response-json";

export function PoolSettingsClient() {
  const { toast } = useToast();
  const [leadDays, setLeadDays] = useState(30);
  const [customerDays, setCustomerDays] = useState(60);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/admin/pool-settings")
      .then((r) => r.json())
      .then((j) => {
        if (j.data) {
          setLeadDays(j.data.leadDays);
          setCustomerDays(j.data.customerDays);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/admin/pool-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadDays, customerDays }),
      });
      const json = await parseResponseJson<{ error?: string }>(res);
      if (!res.ok) throw new Error(json.error ?? "保存失败");
      toast("公海规则已更新");
    } catch (err) {
      toast(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="text-sm text-slate-500">加载中...</div>;

  return (
    <form onSubmit={handleSave} className="max-w-md space-y-4 rounded-lg border bg-white p-6">
      <p className="text-sm text-slate-600">
        超过设定天数未联系的线索/客户将自动进入公海。跑单客户需手动标记，不受此规则影响。
      </p>
      <div>
        <label className="mb-1 block text-sm font-medium">线索未联系天数（进入公海）</label>
        <input
          type="number"
          min={7}
          max={365}
          value={leadDays}
          onChange={(e) => setLeadDays(Number(e.target.value))}
          className="w-full rounded-md border px-3 py-2"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">客户未联系天数（进入公海）</label>
        <input
          type="number"
          min={7}
          max={365}
          value={customerDays}
          onChange={(e) => setCustomerDays(Number(e.target.value))}
          className="w-full rounded-md border px-3 py-2"
        />
      </div>
      <button
        type="submit"
        disabled={saving}
        className="rounded-md bg-teal-600 px-4 py-2 text-sm text-white hover:bg-teal-700 disabled:opacity-50"
      >
        {saving ? "保存中..." : "保存规则"}
      </button>
    </form>
  );
}
