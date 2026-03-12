"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function OrderDeleteButton({
  orderId,
  orderNo,
  variant = "link",
}: {
  orderId: string;
  orderNo: string;
  variant?: "link" | "button";
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (!confirm(`确认删除订单 ${orderNo}？`)) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/orders/${orderId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error ?? "删除失败");
        return;
      }
      router.refresh();
      router.push("/orders");
    } catch {
      alert("删除失败");
    } finally {
      setLoading(false);
    }
  }

  if (variant === "button") {
    return (
      <button
        type="button"
        onClick={handleDelete}
        disabled={loading}
        className="rounded-md border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
      >
        {loading ? "删除中..." : "删除"}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={loading}
      className="text-red-600 hover:underline disabled:opacity-50"
    >
      {loading ? "删除中..." : "删除"}
    </button>
  );
}
