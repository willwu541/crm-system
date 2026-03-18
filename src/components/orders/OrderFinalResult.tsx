"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { OrderStatusSelect } from "./OrderStatusSelect";

interface Props {
  orderId: string;
  selectedSupplier: string | null;
  finalPrice: number | string | null;
  isOrderedToSupplier: boolean;
  mainStatus: string | null;
}

export function OrderFinalResult({
  orderId,
  selectedSupplier,
  finalPrice,
  isOrderedToSupplier,
  mainStatus,
}: Props) {
  const [price, setPrice] = useState(
    finalPrice != null && finalPrice !== "" ? String(finalPrice) : ""
  );
  const [ordered, setOrdered] = useState(isOrderedToSupplier);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  async function saveField(field: "finalPrice" | "isOrderedToSupplier", value: unknown) {
    setSaving(true);
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });
      if (res.ok) router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6">
      <h2 className="mb-4 font-medium text-slate-800">最终结果</h2>
      <dl className="grid gap-3 sm:grid-cols-2">
        <div>
          <dt className="text-sm text-slate-500">选中加工户</dt>
          <dd className="font-medium">{selectedSupplier || "-"}</dd>
        </div>
        <div>
          <dt className="text-sm text-slate-500">最终价格（元）</dt>
          <dd>
            <span className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                onBlur={() => {
                  const v = price.trim() ? parseFloat(price) : null;
                  if (v !== null && !isNaN(v)) saveField("finalPrice", v);
                  else if (price === "") saveField("finalPrice", null);
                }}
                className="w-32 rounded border border-slate-300 px-2 py-1 text-sm"
                placeholder="填写"
              />
              {saving && <span className="text-xs text-slate-500">保存中...</span>}
            </span>
          </dd>
        </div>
        <div>
          <dt className="text-sm text-slate-500">是否已下单加工</dt>
          <dd>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={ordered}
                onChange={(e) => {
                  setOrdered(e.target.checked);
                  saveField("isOrderedToSupplier", e.target.checked);
                }}
                disabled={saving}
                className="rounded border-slate-300"
              />
              <span>{ordered ? "是" : "否"}</span>
            </label>
          </dd>
        </div>
        <div>
          <dt className="text-sm text-slate-500">当前订单状态</dt>
          <dd>
            <OrderStatusSelect orderId={orderId} currentMainStatus={mainStatus} />
          </dd>
        </div>
      </dl>
    </div>
  );
}
