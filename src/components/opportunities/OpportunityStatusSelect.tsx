"use client";

import { useRouter } from "next/navigation";

const OPTIONS = [
  { value: "OPPORTUNITY", label: "商机中" },
  { value: "CONVERTED", label: "已成交" },
  { value: "CANCELLED", label: "已取消" },
];

export function OpportunityStatusSelect({
  opportunityId,
  currentStatus,
}: {
  opportunityId: string;
  currentStatus: string;
}) {
  const router = useRouter();

  async function handleChange(status: string) {
    try {
      const res = await fetch(`/api/opportunities/${opportunityId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) router.refresh();
    } catch (e) {
      console.error(e);
    }
  }

  return (
    <select
      value={currentStatus}
      onChange={(e) => handleChange(e.target.value)}
      className="rounded border border-slate-200 px-2 py-1 text-sm"
    >
      {OPTIONS.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
