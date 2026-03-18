import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { serializeForClient } from "@/lib/utils";
import Link from "next/link";
import { OrderDetailContent } from "@/components/orders/OrderDetailContent";
import { OrderStatusSelect } from "@/components/orders/OrderStatusSelect";
import { OrderProductionSelect } from "@/components/orders/OrderProductionSelect";
import { OrderPaymentSelect } from "@/components/orders/OrderPaymentSelect";
import { OrderDeleteButton } from "@/components/orders/OrderDeleteButton";
import { OrderFinalResult } from "@/components/orders/OrderFinalResult";

const STATUS_MAP: Record<string, string> = {
  DRAFT: "草稿",
  PUBLISHED: "已发布",
  CLOSED: "已关闭",
};

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getSession();
  if (!user) return null;

  const order = await prisma.order.findFirst({
    where: {
      id,
      ...(user.role === "SALES" ? { createdById: user.id } : {}),
    },
    include: {
      createdBy: { select: { name: true } },
      selectedQuote: { select: { id: true, supplierName: true } },
      items: { orderBy: { sortOrder: "asc" }, include: { attachments: true } },
      attachments: { where: { orderItemId: null } },
      _count: { select: { quotes: true } },
    },
  });

  if (!order) notFound();

  const itemAttachments: Record<string, { id: string; fileName: string; filePath: string; fileSize: number; orderItemId: string | null }[]> = {};
  order.items.forEach((item) => {
    itemAttachments[item.id] = serializeForClient(item.attachments);
  });

  const serializedAttachments = serializeForClient(order.attachments);
  const serializedItems = serializeForClient(order.items);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-800">
          订单详情 - {order.orderNo}
        </h1>
        <div className="flex gap-2">
          <Link
            href={`/orders/${id}/quotes`}
            className="rounded-md bg-teal-600 px-4 py-2 text-sm text-white hover:bg-teal-700"
          >
            查看报价 ({order._count.quotes})
          </Link>
          <Link
            href="/orders"
            className="rounded-md border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50"
          >
            返回列表
          </Link>
          <OrderDeleteButton
            orderId={id}
            orderNo={order.orderNo}
            variant="button"
          />
        </div>
      </div>

      <OrderFinalResult
        orderId={id}
        selectedSupplier={order.selectedQuote?.supplierName ?? null}
        finalPrice={order.finalPrice != null ? String(order.finalPrice) : null}
        isOrderedToSupplier={order.isOrderedToSupplier}
        mainStatus={order.mainStatus}
      />

      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="mb-4 font-medium text-slate-800">主信息</h2>
        <dl className="grid gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-sm text-slate-500">订单编号</dt>
            <dd className="font-medium">{order.orderNo}</dd>
          </div>
          <div>
            <dt className="text-sm text-slate-500">主状态</dt>
            <dd>
              <OrderStatusSelect orderId={id} currentMainStatus={order.mainStatus} />
            </dd>
          </div>
          <div>
            <dt className="text-sm text-slate-500">生产方式</dt>
            <dd>
              <OrderProductionSelect
                orderId={id}
                currentMode={order.productionMode}
              />
            </dd>
          </div>
          <div>
            <dt className="text-sm text-slate-500">客户收款</dt>
            <dd>
              <OrderPaymentSelect
                orderId={id}
                type="customer"
                currentStatus={order.customerPaymentStatus}
              />
            </dd>
          </div>
          <div>
            <dt className="text-sm text-slate-500">加工户付款</dt>
            <dd>
              <OrderPaymentSelect
                orderId={id}
                type="supplier"
                currentStatus={order.supplierPaymentStatus}
              />
            </dd>
          </div>
          <div>
            <dt className="text-sm text-slate-500">报价截止时间</dt>
            <dd>
              {order.quoteDeadline
                ? new Date(order.quoteDeadline).toLocaleString("zh-CN")
                : "-"}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-slate-500">创建人</dt>
            <dd>{order.createdBy.name}</dd>
          </div>
          <div>
            <dt className="text-sm text-slate-500">报价数</dt>
            <dd>{order._count.quotes}</dd>
          </div>
        </dl>
        {order.remark && (
          <div className="mt-4">
            <dt className="text-sm text-slate-500">总体备注</dt>
            <dd className="mt-1 text-slate-700">{order.remark}</dd>
          </div>
        )}
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="mb-4 font-medium text-slate-800">订单明细</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="px-3 py-2 text-left font-medium">产品类型</th>
                <th className="px-3 py-2 text-left font-medium">规格型号</th>
                <th className="px-3 py-2 text-left font-medium">尺寸</th>
                <th className="px-3 py-2 text-left font-medium">数量</th>
                <th className="px-3 py-2 text-left font-medium">单位</th>
                <th className="px-3 py-2 text-left font-medium">表面处理</th>
                <th className="px-3 py-2 text-left font-medium">特殊要求</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item) => (
                <tr key={item.id} className="border-b border-slate-100">
                  <td className="px-3 py-2">{item.productType}</td>
                  <td className="px-3 py-2">{item.specModel}</td>
                  <td className="px-3 py-2">{item.dimensions ?? "-"}</td>
                  <td className="px-3 py-2">{String(item.quantity)}</td>
                  <td className="px-3 py-2">{item.unit}</td>
                  <td className="px-3 py-2">{item.surfaceTreatment ?? "-"}</td>
                  <td className="px-3 py-2">{item.specialRequirement ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="mb-4 font-medium text-slate-800">图纸文件</h2>
        <p className="mb-4 text-sm text-slate-500">
          支持 pdf、jpg、png、gif、zip，单文件不超过 10MB。可上传订单级附件或明细级附件。
        </p>
        <OrderDetailContent
          orderId={id}
          orderAttachments={serializedAttachments}
          itemAttachments={itemAttachments}
          orderItems={serializedItems}
        />
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="mb-4 font-medium text-slate-800">外协链接</h2>
        <OrderDetailContent
          orderId={id}
          orderAttachments={[]}
          itemAttachments={{}}
          orderItems={serializedItems}
          showQuoteLinks
        />
      </div>
    </div>
  );
}
