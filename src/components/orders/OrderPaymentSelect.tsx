"use client";

import { useRouter } from "next/navigation";

const OPTIONS = [
  { value: "UNPAID", label: "未收" },
  { value: "PARTIAL", label: "部分收" },
  { value: "PAID", label: "已收" },
];

const SUPPLIER_OPTIONS = [
  { value: "UNPAID", label: "未付" },
  { value: "PARTIAL", label: "部分付" },
  { value: "PAID", label: "已付" },
];

export function OrderPaymentSelect({
  orderId,
  type,
  currentStatus,
}: {
  orderId: string;
  type: "customer" | "supplier";
  currentStatus: string | null;
}) {
  const router = useRouter();
  const options = type === "customer" ? OPTIONS : SUPPLIER_OPTIONS;

  async function handleChange(status: string) {
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          type === "customer"
            ? { customerPaymentStatus: status || null }
            : { supplierPaymentStatus: status || null }
        ),
      });
      if (res.ok) router.refresh();
    } catch (e) {
      console.error(e);
    }
  }

  return (
    <select
      value={currentStatus || ""}
      onChange={(e) => handleChange(e.target.value)}
      className="rounded border border-slate-200 px-2 py-1 text-sm"
    >
      <option value="">-</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
