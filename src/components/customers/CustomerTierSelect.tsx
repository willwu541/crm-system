"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";
import { parseResponseJson } from "@/lib/parse-response-json";

const TIER_OPTIONS = [
  { value: "VIP", label: "VIP", color: "bg-amber-100 text-amber-800 border-amber-300" },
  { value: "NORMAL", label: "普通", color: "bg-slate-100 text-slate-600 border-slate-300" },
  { value: "LOW", label: "低优先", color: "bg-slate-50 text-slate-400 border-slate-200" },
];

export function CustomerTierSelect({ customerId, currentTier }: { customerId: string; currentTier: string }) {
  const { toast } = useToast();
  const router = useRouter();
  const [tier, setTier] = useState(currentTier);
  const [saving, setSaving] = useState(false);

  async function change(newTier: string) {
    if (newTier === tier) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/customers/${customerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier: newTier }),
      });
      if (!res.ok) {
        const j = await parseResponseJson<{ error?: string }>(res);
        throw new Error(j.error ?? "更新失败");
      }
      setTier(newTier);
      toast("已更新");
      router.refresh();
    } catch (e) {
      toast(e instanceof Error ? e.message : "更新失败");
    } finally { setSaving(false); }
  }

  return (
    <div className="inline-flex gap-1">
      {TIER_OPTIONS.map(opt => (
        <button
          key={opt.value}
          onClick={() => change(opt.value)}
          disabled={saving}
          className={`rounded border px-2 py-0.5 text-xs font-medium transition-all ${
            tier === opt.value
              ? `${opt.color} border-2`
              : "border-slate-200 text-slate-400 hover:border-slate-300"
          } disabled:opacity-50`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export function TierBadge({ tier }: { tier: string }) {
  const opt = TIER_OPTIONS.find(o => o.value === tier);
  if (!opt) return null;
  return (
    <span className={`rounded px-1.5 py-0.5 text-xs ${opt.color.split(" ").slice(0, 2).join(" ")}`}>
      {tier === "VIP" && "⭐"}{opt.label}
    </span>
  );
}
