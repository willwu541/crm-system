"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Customer {
  id: string;
  name: string;
}

interface Props {
  initial?: {
    customerId: string;
    projectName: string;
    isQuoted: boolean;
    intentionLevel: string | null;
    estimatedAmount: string;
    remark: string;
  };
  opportunityId?: string;
}

export function OpportunityForm({ initial, opportunityId }: Props) {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [customerId, setCustomerId] = useState(initial?.customerId ?? "");
  const [projectName, setProjectName] = useState(initial?.projectName ?? "");
  const [isQuoted, setIsQuoted] = useState(initial?.isQuoted ?? false);
  const [intentionLevel, setIntentionLevel] = useState(initial?.intentionLevel ?? "");
  const [estimatedAmount, setEstimatedAmount] = useState(initial?.estimatedAmount ?? "");
  const [remark, setRemark] = useState(initial?.remark ?? "");

  useEffect(() => {
    fetch("/api/customers")
      .then((r) => r.json())
      .then((j) => setCustomers(j.data || []));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const url = opportunityId ? `/api/opportunities/${opportunityId}` : "/api/opportunities";
      const method = opportunityId ? "PUT" : "POST";
      const body: Record<string, unknown> = {
        projectName: projectName.trim(),
        isQuoted,
        intentionLevel: intentionLevel || null,
        estimatedAmount: estimatedAmount ? Number(estimatedAmount) : null,
        remark: remark.trim() || null,
      };
      if (!opportunityId) (body as Record<string, unknown>).customerId = customerId;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "保存失败");
      router.push(opportunityId ? `/opportunities/${opportunityId}` : "/opportunities");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-xl space-y-4">
      {error && (
        <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
      )}
      {!opportunityId && (
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">客户 *</label>
          <select
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            required
            className="w-full rounded-md border border-slate-300 px-3 py-2"
          >
            <option value="">请选择客户</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      )}
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">项目名称 *</label>
        <input
          type="text"
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
          required
          className="w-full rounded-md border border-slate-300 px-3 py-2"
        />
      </div>
      <div className="flex gap-4">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={isQuoted}
            onChange={(e) => setIsQuoted(e.target.checked)}
          />
          已报价
        </label>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">意向等级</label>
          <select
            value={intentionLevel}
            onChange={(e) => setIntentionLevel(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2"
          >
            <option value="">-</option>
            <option value="HIGH">高</option>
            <option value="MEDIUM">中</option>
            <option value="LOW">低</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">预估金额</label>
          <input
            type="number"
            step="0.01"
            value={estimatedAmount}
            onChange={(e) => setEstimatedAmount(e.target.value)}
            className="w-32 rounded-md border border-slate-300 px-3 py-2"
          />
        </div>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">备注</label>
        <textarea
          value={remark}
          onChange={(e) => setRemark(e.target.value)}
          rows={3}
          className="w-full rounded-md border border-slate-300 px-3 py-2"
        />
      </div>
      <div className="flex gap-4">
        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-blue-600 px-6 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "保存中..." : "保存"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-md border border-slate-300 px-6 py-2 text-slate-700 hover:bg-slate-50"
        >
          取消
        </button>
      </div>
    </form>
  );
}
