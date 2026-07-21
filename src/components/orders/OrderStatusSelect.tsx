"use client";

import { useRouter } from "next/navigation";

interface Props {
  orderId: string;
  currentMainStatus: string | null;
}

const STEPS = [
  { value: "CONVERTED", label: "已成交", color: "bg-purple-100 text-purple-700 border-purple-300" },
  { value: "IN_PRODUCTION", label: "生产中", color: "bg-amber-100 text-amber-700 border-amber-300" },
  { value: "PENDING_SHIPMENT", label: "待发货", color: "bg-sky-100 text-sky-700 border-sky-300" },
  { value: "COMPLETED", label: "已完成", color: "bg-emerald-100 text-emerald-700 border-emerald-300" },
  { value: "CANCELLED", label: "已取消", color: "bg-slate-200 text-slate-600 border-slate-300" },
];

export function OrderStatusSelect({ orderId, currentMainStatus }: Props) {
  const router = useRouter();
  const current = currentMainStatus || "CONVERTED";
  const currentIdx = STEPS.findIndex(s => s.value === current);

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
    <div className="flex flex-wrap items-center gap-1.5">
      {STEPS.map((step, idx) => {
        const isActive = current === step.value;
        const isPast = currentIdx >= 0 && idx < currentIdx;
        const isCancelled = current === "CANCELLED";

        return (
          <button
            key={step.value}
            type="button"
            onClick={() => handleChange(step.value)}
            className={`rounded-md border px-3 py-1.5 text-sm font-medium transition-all ${
              isActive
                ? `${step.color} border-2 shadow-sm scale-105`
                : isPast && !isCancelled
                ? "bg-slate-50 text-slate-400 border-slate-200"
                : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"
            }`}
          >
            {step.label}
          </button>
        );
      })}
    </div>
  );
}
