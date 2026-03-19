"use client";

import { useState, useEffect, Suspense } from "react";
import { useParams } from "next/navigation";

interface OrderItem {
  id: string;
  productType: string;
  specModel: string;
  dimensions: string | null;
  quantity: number;
  unit: string;
  surfaceTreatment: string | null;
  specialRequirement: string | null;
  attachments?: { fileName: string; filePath: string }[];
}

interface Order {
  orderNo: string;
  quoteDeadline: string | null;
}

interface Attachment {
  fileName: string;
  filePath: string;
}

export default function QuotePage() {
  const params = useParams();
  const token = params.token as string;
  const [data, setData] = useState<{
    order: Order;
    items: OrderItem[];
    orderAttachments: Attachment[];
    expired: boolean;
    expiresAt: string | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [supplierName, setSupplierName] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactWechat, setContactWechat] = useState("");
  const [totalRemark, setTotalRemark] = useState("");
  const [expectedDelivery, setExpectedDelivery] = useState("");
  const [includeTax, setIncludeTax] = useState(false);
  const [includeShipping, setIncludeShipping] = useState(false);
  const [quoteItems, setQuoteItems] = useState<Record<string, { price: string; remark: string }>>({});

  useEffect(() => {
    fetch(`/api/quote/${token}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.error) {
          setError(json.error);
          return;
        }
        setData(json.data);
        const initial: Record<string, { price: string; remark: string }> = {};
        json.data.items.forEach((i: OrderItem) => {
          initial[i.id] = { price: "", remark: "" };
        });
        setQuoteItems(initial);
      })
      .catch(() => setError("加载失败"))
      .finally(() => setLoading(false));
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    const items = Object.entries(quoteItems)
      .filter(([, v]) => v.price && Number(v.price) >= 0)
      .map(([orderItemId, v]) => ({
        orderItemId,
        price: Number(v.price),
        remark: v.remark.trim() || undefined,
      }));

    if (items.length === 0) {
      setError("请至少填写一条报价");
      setSubmitting(false);
      return;
    }

    try {
      const res = await fetch(`/api/quote/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplierName: supplierName.trim(),
          contactName: contactName.trim(),
          contactPhone: contactPhone.trim(),
          contactWechat: contactWechat.trim() || undefined,
          totalRemark: totalRemark.trim() || undefined,
          expectedDelivery: expectedDelivery || undefined,
          includeTax,
          includeShipping,
          quoteItems: items,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "提交失败");
      setSubmitted(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "提交失败");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <div className="text-slate-600">加载中...</div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <div className="rounded-lg border border-red-200 bg-white p-8 text-center text-red-600">
          {error}
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <div className="rounded-lg border border-green-200 bg-white p-8 text-center">
          <h2 className="text-xl font-semibold text-green-700">报价已提交</h2>
          <p className="mt-2 text-slate-600">感谢您的报价，我们会尽快与您联系。</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { order, items, orderAttachments, expired } = data;

  return (
    <div className="min-h-screen bg-slate-100 py-4 sm:py-8">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <div className="rounded-lg border border-slate-200 bg-white p-4 sm:p-6 shadow-sm">
          <h1 className="mb-6 text-xl font-semibold text-slate-800">
            客户报价 - {order.orderNo}
          </h1>

          {expired && (
            <div className="mb-4 rounded-md bg-red-50 px-4 py-3 text-red-600">
              此链接已过期，无法继续填写报价。
            </div>
          )}

          <div className="mb-6">
            <h2 className="mb-2 font-medium text-slate-800">订单信息</h2>
            <dl className="grid gap-2 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-slate-500">订单编号</dt>
                <dd className="font-medium">{order.orderNo}</dd>
              </div>
              <div>
                <dt className="text-slate-500">报价截止</dt>
                <dd>{order.quoteDeadline ? new Date(order.quoteDeadline).toLocaleString("zh-CN") : "-"}</dd>
              </div>
            </dl>
          </div>

          <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50/50 p-4">
            <h2 className="mb-3 font-medium text-slate-800">图纸文件</h2>
            {orderAttachments.length > 0 || items.some((i) => i.attachments?.length) ? (
              <div className="flex flex-wrap gap-2">
                {orderAttachments.map((a) => (
                  <a
                    key={a.filePath}
                    href={`/api/quote/${token}/download?path=${encodeURIComponent(a.filePath)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded border border-slate-200 bg-white px-3 py-2 text-sm text-teal-600 shadow-sm hover:bg-teal-50 hover:underline"
                  >
                    <span aria-hidden>📎</span>
                    {a.fileName}（下载）
                  </a>
                ))}
                {items.map((item) =>
                  item.attachments?.map((a) => (
                    <a
                      key={`${item.id}-${a.filePath}`}
                      href={`/api/quote/${token}/download?path=${encodeURIComponent(a.filePath)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded border border-slate-200 bg-white px-3 py-2 text-sm text-teal-600 shadow-sm hover:bg-teal-50 hover:underline"
                    >
                      <span aria-hidden>📎</span>
                      {item.specModel} - {a.fileName}（下载）
                    </a>
                  ))
                )}
              </div>
            ) : (
              <p className="text-sm text-amber-800">
                暂无图纸附件。如需图纸请与甲方联系，或请甲方在订单详情页上传后重新发送链接。
              </p>
            )}
          </div>

          <div className="mb-6">
            <h2 className="mb-3 font-medium text-slate-800">订单明细</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="px-2 py-2 text-left">产品</th>
                    <th className="px-2 py-2 text-left">规格</th>
                    <th className="px-2 py-2 text-left">尺寸</th>
                    <th className="px-2 py-2 text-left">数量</th>
                    <th className="px-2 py-2 text-left">单位</th>
                    <th className="px-2 py-2 text-left">您的报价</th>
                    <th className="px-2 py-2 text-left">备注</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} className="border-b border-slate-100">
                      <td className="px-2 py-2">{item.productType}</td>
                      <td className="px-2 py-2">{item.specModel}</td>
                      <td className="px-2 py-2">{item.dimensions ?? "-"}</td>
                      <td className="px-2 py-2">{item.quantity}</td>
                      <td className="px-2 py-2">{item.unit}</td>
                      <td className="px-2 py-2">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={quoteItems[item.id]?.price ?? ""}
                          onChange={(e) =>
                            setQuoteItems((prev) => ({
                              ...prev,
                              [item.id]: {
                                ...prev[item.id],
                                price: e.target.value,
                              },
                            }))
                          }
                          disabled={expired}
                          className="min-w-[4rem] w-20 sm:w-24 rounded border border-slate-300 px-2 py-1.5"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <input
                          type="text"
                          value={quoteItems[item.id]?.remark ?? ""}
                          onChange={(e) =>
                            setQuoteItems((prev) => ({
                              ...prev,
                              [item.id]: {
                                ...prev[item.id],
                                remark: e.target.value,
                              },
                            }))
                          }
                          disabled={expired}
                          className="min-w-[4rem] w-20 sm:w-24 rounded border border-slate-300 px-2 py-1.5"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <h2 className="font-medium text-slate-800">您的信息</h2>
            {error && (
              <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
                {error}
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium">厂家名称 *</label>
                <input
                  type="text"
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
                  required
                  disabled={expired}
                  className="w-full rounded border border-slate-300 px-3 py-2"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">联系人 *</label>
                <input
                  type="text"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  required
                  disabled={expired}
                  className="w-full rounded border border-slate-300 px-3 py-2"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">手机号 *</label>
                <input
                  type="text"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  required
                  disabled={expired}
                  className="w-full rounded border border-slate-300 px-3 py-2"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">微信/邮箱</label>
                <input
                  type="text"
                  value={contactWechat}
                  onChange={(e) => setContactWechat(e.target.value)}
                  disabled={expired}
                  className="w-full rounded border border-slate-300 px-3 py-2"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">预计交期</label>
                <input
                  type="date"
                  value={expectedDelivery}
                  onChange={(e) => setExpectedDelivery(e.target.value)}
                  disabled={expired}
                  className="w-full rounded border border-slate-300 px-3 py-2"
                />
              </div>
              <div className="flex items-center gap-4 sm:col-span-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={includeTax}
                    onChange={(e) => setIncludeTax(e.target.checked)}
                    disabled={expired}
                  />
                  含税
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={includeShipping}
                    onChange={(e) => setIncludeShipping(e.target.checked)}
                    disabled={expired}
                  />
                  含运费
                </label>
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium">总体备注</label>
                <textarea
                  value={totalRemark}
                  onChange={(e) => setTotalRemark(e.target.value)}
                  rows={3}
                  disabled={expired}
                  className="w-full rounded border border-slate-300 px-3 py-2"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={expired || submitting}
              className="w-full sm:w-auto min-h-[44px] rounded-md bg-teal-600 px-6 py-3 font-medium text-white hover:bg-teal-700 disabled:opacity-50 touch-manipulation"
            >
              {submitting ? "提交中..." : "提交报价"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
