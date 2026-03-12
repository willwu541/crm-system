"use client";

import { useRouter } from "next/navigation";

const OPTIONS = [
  { value: "SELF", label: "自制" },
  { value: "OUTSOURCE", label: "外放" },
  { value: "MIXED", label: "混合" },
];

export function OrderProductionSelect({
  orderId,
  currentMode,
}: {
  orderId: string;
  currentMode: string | null;
}) {
  const router = useRouter();

  async function handleChange(productionMode: string) {
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productionMode: productionMode || null }),
      });
      if (res.ok) router.refresh();
    } catch (e) {
      console.error(e);
    }
  }

  return (
    <select
      value={currentMode || ""}
      onChange={(e) => handleChange(e.target.value)}
      className="rounded border border-slate-200 px-2 py-1 text-sm"
    >
      <option value="">-</option>
      {OPTIONS.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
