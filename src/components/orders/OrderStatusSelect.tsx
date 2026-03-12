"use client";

import { useRouter } from "next/navigation";

interface Props {
  orderId: string;
  currentMainStatus: string | null;
}

const MAIN_STATUS_OPTIONS = [
  { value: "CONVERTED", label: "已成交" },
  { value: "IN_PRODUCTION", label: "生产中" },
  { value: "PENDING_SHIPMENT", label: "待发货" },
  { value: "COMPLETED", label: "已完成" },
  { value: "CANCELLED", label: "已取消" },
];

export function OrderStatusSelect({ orderId, currentMainStatus }: Props) {
  const router = useRouter();
  const value = currentMainStatus || "CONVERTED";

  async function handleChange(mainStatus: string) {
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mainStatus }),
      });
      if (res.ok) router.refresh();
    } catch (e) {
      console.error(e);
    }
  }

  return (
    <select
      value={value}
      onChange={(e) => handleChange(e.target.value)}
      className="rounded border border-slate-200 px-2 py-1 text-sm"
    >
      {MAIN_STATUS_OPTIONS.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
