"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface OrderItemForm {
  productType: string;
  specModel: string;
  dimensions: string;
  quantity: string;
  unit: string;
  surfaceTreatment: string;
  specialRequirement: string;
  remark: string;
}

const emptyItem: OrderItemForm = {
  productType: "",
  specModel: "",
  dimensions: "",
  quantity: "",
  unit: "件",
  surfaceTreatment: "",
  specialRequirement: "",
  remark: "",
};

export function OrderForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [orderNo, setOrderNo] = useState("");
  const [quoteDeadline, setQuoteDeadline] = useState("");
  const [remark, setRemark] = useState("");

  const [items, setItems] = useState<OrderItemForm[]>([{ ...emptyItem }]);

  function addItem() {
    setItems((prev) => [...prev, { ...emptyItem }]);
  }

  function removeItem(index: number) {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  function updateItem(index: number, field: keyof OrderItemForm, value: string) {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const validItems = items.filter(
      (i) => i.productType.trim() && i.specModel.trim() && i.quantity && i.unit.trim()
    );
    if (validItems.length === 0) {
      setError("至少添加一条有效明细（产品类型、规格型号、数量、单位必填）");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderNo: orderNo.trim() || undefined,
          quoteDeadline: quoteDeadline || undefined,
          remark: remark.trim() || undefined,
          items: validItems.map((i) => ({
            productType: i.productType.trim(),
            specModel: i.specModel.trim(),
            dimensions: i.dimensions.trim() || undefined,
            quantity: Number(i.quantity) || 0,
            unit: i.unit.trim(),
            surfaceTreatment: i.surfaceTreatment.trim() || undefined,
            specialRequirement: i.specialRequirement.trim() || undefined,
            remark: i.remark.trim() || undefined,
          })),
        }),
      });

      let data: { error?: string; data?: { id: string } };
      try {
        data = await res.json();
      } catch {
        setError(res.ok ? "响应解析失败" : `请求失败 (${res.status})`);
        return;
      }
      if (!res.ok) {
        setError(data?.error ?? "创建失败");
        return;
      }
      router.push(`/orders/${data.data!.id}`);
      router.refresh();
    } catch (err) {
      setError("网络错误，请重试");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* 图纸文件 */}
      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="mb-2 font-medium text-slate-800">图纸文件</h2>
        <p className="text-sm text-slate-600">
          订单创建后将跳转到详情页，可在该页上传图纸（支持 pdf、jpg、png、gif、zip，单文件不超过 10MB）。
        </p>
      </div>

      {/* 订单主信息 */}
      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="mb-4 font-medium text-slate-800">订单信息</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              订单编号
            </label>
            <input
              type="text"
              value={orderNo}
              onChange={(e) => setOrderNo(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2"
              placeholder="不填则自动生成"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              报价截止时间
            </label>
            <input
              type="datetime-local"
              value={quoteDeadline}
              onChange={(e) => setQuoteDeadline(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2"
            />
          </div>
        </div>
        <div className="mt-4">
          <label className="mb-1 block text-sm font-medium text-slate-700">
            内部备注（加工户不可见）
          </label>
          <textarea
            value={remark}
            onChange={(e) => setRemark(e.target.value)}
            rows={2}
            className="w-full rounded-md border border-slate-300 px-3 py-2"
            placeholder="可选"
          />
        </div>
      </div>

      {/* 订单明细 */}
      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-medium text-slate-800">订单明细</h2>
          <button
            type="button"
            onClick={addItem}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
          >
            + 添加明细
          </button>
        </div>

        <div className="space-y-4">
          {items.map((item, index) => (
            <div
              key={index}
              className="rounded-md border border-slate-100 bg-slate-50/50 p-4"
            >
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-medium text-slate-600">
                  明细 #{index + 1}
                </span>
                <button
                  type="button"
                  onClick={() => removeItem(index)}
                  disabled={items.length <= 1}
                  className="text-sm text-red-600 hover:underline disabled:opacity-40 disabled:hover:no-underline"
                >
                  删除
                </button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <label className="mb-1 block text-xs text-slate-600">
                    产品类型 *
                  </label>
                  <input
                    type="text"
                    value={item.productType}
                    onChange={(e) =>
                      updateItem(index, "productType", e.target.value)
                    }
                    className="w-full rounded border border-slate-200 px-2 py-1.5 text-sm"
                    placeholder="如：钢格板"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-slate-600">
                    规格型号 *
                  </label>
                  <input
                    type="text"
                    value={item.specModel}
                    onChange={(e) =>
                      updateItem(index, "specModel", e.target.value)
                    }
                    className="w-full rounded border border-slate-200 px-2 py-1.5 text-sm"
                    placeholder="如：G303/30/100"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-slate-600">尺寸</label>
                  <input
                    type="text"
                    value={item.dimensions}
                    onChange={(e) =>
                      updateItem(index, "dimensions", e.target.value)
                    }
                    className="w-full rounded border border-slate-200 px-2 py-1.5 text-sm"
                    placeholder="如：1000×500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-slate-600">
                    数量 *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.quantity}
                    onChange={(e) =>
                      updateItem(index, "quantity", e.target.value)
                    }
                    className="w-full rounded border border-slate-200 px-2 py-1.5 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-slate-600">
                    单位 *
                  </label>
                  <input
                    type="text"
                    value={item.unit}
                    onChange={(e) => updateItem(index, "unit", e.target.value)}
                    className="w-full rounded border border-slate-200 px-2 py-1.5 text-sm"
                    placeholder="件、㎡、吨"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-slate-600">
                    表面处理
                  </label>
                  <input
                    type="text"
                    value={item.surfaceTreatment}
                    onChange={(e) =>
                      updateItem(index, "surfaceTreatment", e.target.value)
                    }
                    className="w-full rounded border border-slate-200 px-2 py-1.5 text-sm"
                    placeholder="热镀锌、喷漆等"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs text-slate-600">
                    特殊要求
                  </label>
                  <input
                    type="text"
                    value={item.specialRequirement}
                    onChange={(e) =>
                      updateItem(index, "specialRequirement", e.target.value)
                    }
                    className="w-full rounded border border-slate-200 px-2 py-1.5 text-sm"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs text-slate-600">
                    明细备注
                  </label>
                  <input
                    type="text"
                    value={item.remark}
                    onChange={(e) =>
                      updateItem(index, "remark", e.target.value)
                    }
                    className="w-full rounded border border-slate-200 px-2 py-1.5 text-sm"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-4">
        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-teal-600 px-6 py-2 font-medium text-white hover:bg-teal-700 disabled:opacity-50"
        >
          {loading ? "提交中..." : "创建订单"}
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
