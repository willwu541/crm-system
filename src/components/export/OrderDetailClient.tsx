"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useToast } from "@/components/ui/Toast";
import { OrderFormClient } from "./OrderFormClient";
import { ExportDeleteButton } from "./ExportDeleteButton";

export function OrderDetailClient({ orderId }: { orderId: string }) {
  const { toast } = useToast();
  const [order, setOrder] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);

  async function fetchOrder() {
    setLoading(true);
    try {
      const res = await fetch(`/api/export/orders/${orderId}`);
      const json = await res.json();
      if (res.ok && json.data) setOrder(json.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchOrder();
  }, [orderId]);

  if (loading) return <div className="p-8 text-center text-slate-500">加载中...</div>;
  if (!order) return <div className="p-8 text-center text-slate-500">订单不存在</div>;

  if (editing) {
    return (
      <div>
        <OrderFormClient
          orderId={orderId}
          initial={order}
          onSuccess={() => {
            toast("保存成功");
            setEditing(false);
            fetchOrder();
          }}
          onCancel={() => setEditing(false)}
        />
        <button
          onClick={() => setEditing(false)}
          className="mt-4 text-sm text-slate-600 hover:underline"
        >
          取消编辑
        </button>
      </div>
    );
  }

  const customer = order.customer as { id: string; companyName: string } | undefined;
  const quote = order.quote as { id: string; quoteNo: string } | undefined;
  const items = (order.items as { productType: string; spec: string | null; description: string | null; quantity: string; unit: string; unitPrice: string; amount: string }[]) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">{String(order.orderNo)}</h1>
          <p className="text-sm text-slate-500">{customer?.companyName ?? ""}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setEditing(true)}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50"
          >
            编辑
          </button>
          <ExportDeleteButton
            apiPath={`/api/export/orders/${orderId}`}
            redirectTo="/export/orders"
            label="删除订单"
            className="rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700 hover:bg-red-100 disabled:opacity-50"
          />
          <Link
            href="/export/orders"
            className="rounded-md border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50"
          >
            返回
          </Link>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-slate-500">客户</dt>
            <dd>
              {customer && (
                <Link href={`/export/customers/${customer.id}`} className="text-teal-600 hover:underline">
                  {customer.companyName}
                </Link>
              )}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">关联报价</dt>
            <dd>
              {quote ? (
                <Link href={`/export/quotes/${quote.id}`} className="text-teal-600 hover:underline">
                  {quote.quoteNo}
                </Link>
              ) : "-"}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">订单日期</dt>
            <dd>{order.orderDate ? new Date(order.orderDate as string).toLocaleDateString("zh-CN") : "-"}</dd>
          </div>
          <div>
            <dt className="text-slate-500">币种</dt>
            <dd>{String(order.currency ?? "-")}</dd>
          </div>
          <div>
            <dt className="text-slate-500">总金额</dt>
            <dd>{order.totalAmount != null ? String(order.totalAmount) : "-"}</dd>
          </div>
          <div>
            <dt className="text-slate-500">付款状态</dt>
            <dd>{String(order.paymentStatus ?? "-")}</dd>
          </div>
          <div>
            <dt className="text-slate-500">生产状态</dt>
            <dd>{String(order.productionStatus ?? "-")}</dd>
          </div>
          <div>
            <dt className="text-slate-500">发货状态</dt>
            <dd>{String(order.shippingStatus ?? "-")}</dd>
          </div>
          <div>
            <dt className="text-slate-500">ETA</dt>
            <dd>{order.eta ? new Date(order.eta as string).toLocaleDateString("zh-CN") : "-"}</dd>
          </div>
          <div>
            <dt className="text-slate-500">实际发货日</dt>
            <dd>{order.actualShipDate ? new Date(order.actualShipDate as string).toLocaleDateString("zh-CN") : "-"}</dd>
          </div>
          {items.length > 0 && (
            <div className="sm:col-span-2">
              <dt className="mb-2 text-slate-500">明细</dt>
              <dd>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="py-2 text-left font-medium">产品类型</th>
                      <th className="py-2 text-left font-medium">规格</th>
                      <th className="py-2 text-right font-medium">数量</th>
                      <th className="py-2 text-left font-medium">单位</th>
                      <th className="py-2 text-right font-medium">单价</th>
                      <th className="py-2 text-right font-medium">金额</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, i) => (
                      <tr key={i} className="border-b border-slate-100">
                        <td className="py-2">{item.productType}</td>
                        <td className="py-2">{item.spec ?? "-"}</td>
                        <td className="py-2 text-right">{item.quantity}</td>
                        <td className="py-2">{item.unit}</td>
                        <td className="py-2 text-right">{item.unitPrice}</td>
                        <td className="py-2 text-right">{item.amount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </dd>
            </div>
          )}
          {order.notes ? (
            <div className="sm:col-span-2">
              <dt className="text-slate-500">备注</dt>
              <dd className="mt-1 text-slate-700">{String(order.notes)}</dd>
            </div>
          ) : null}
        </dl>
      </div>
    </div>
  );
}
