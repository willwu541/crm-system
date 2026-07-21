import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { customerOwnerFilter, CUSTOMER_STATUS_LABELS } from "@/lib/domestic/customer-access";
import { isAiConfigured } from "@/lib/domestic/ai-analysis";
import { RecordingPanel, type RecordingItem } from "@/components/customers/RecordingPanel";
import { CustomerPoolActions } from "@/components/customers/CustomerPoolActions";
import { FollowUpTimeline } from "@/components/customers/FollowUpTimeline";
import { CustomerAttachments } from "@/components/customers/CustomerAttachments";
import { CustomerTierSelect } from "@/components/customers/CustomerTierSelect";
import { serializeForClient } from "@/lib/utils";

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getSession();
  if (!user) redirect("/login");

  const { id } = await params;
  const customer = await prisma.customer.findFirst({
    where: { id, ...customerOwnerFilter(user) },
    include: {
      owner: { select: { name: true } },
      recordings: {
        orderBy: { createdAt: "desc" },
        include: { uploadedBy: { select: { name: true } } },
      },
      orders: {
        select: { id: true, orderNo: true, projectName: true, mainStatus: true, createdAt: true, totalAmount: true },
        orderBy: { createdAt: "desc" },
        take: 10,
      },
      quotes: {
        select: { id: true, quoteNo: true, totalAmount: true, status: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
  });

  if (!customer) notFound();

  const serialized = serializeForClient(customer);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold text-slate-800">{customer.name}</h1>
            <CustomerTierSelect customerId={customer.id} currentTier={customer.tier} />
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {CUSTOMER_STATUS_LABELS[customer.status]} · 负责人 {customer.owner.name}
            {customer.isInPool && (
              <span className="ml-2 rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-800">
                {customer.isDealLost ? `跑单${customer.dealLostReason ? `（${customer.dealLostReason}）` : ""}` : "公海中"}
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/quotes/new?customerId=${customer.id}`}
            className="rounded-md bg-teal-600 px-4 py-2 text-sm text-white hover:bg-teal-700"
          >
            + 新建报价
          </Link>
          <Link
            href={`/orders/new?customerId=${customer.id}`}
            className="rounded-md border border-teal-300 bg-teal-50 px-4 py-2 text-sm text-teal-700 hover:bg-teal-100"
          >
            + 新建订单
          </Link>
          <CustomerPoolActions
            customerId={customer.id}
            customerName={customer.name}
            isInPool={customer.isInPool}
            isDealLost={customer.isDealLost}
          />
          <Link
            href="/customers/reactivation"
            className="rounded-md border border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-800 hover:bg-amber-100"
          >
            私域唤醒
          </Link>
          <Link href="/customers" className="rounded-md border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50">
            返回列表
          </Link>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white p-6 space-y-3 text-sm">
          <h2 className="font-medium text-slate-800">基本信息</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            <div><span className="text-slate-500">联系人：</span>{customer.contactName}</div>
            <div><span className="text-slate-500">电话：</span>{customer.contactPhone}</div>
            <div><span className="text-slate-500">微信：</span>{customer.wechat || "-"}</div>
            <div><span className="text-slate-500">地区：</span>{customer.region || "-"}</div>
            <div><span className="text-slate-500">来源：</span>{customer.source || "-"}</div>
            <div>
              <span className="text-slate-500">最后联系：</span>
              {customer.lastContactAt
                ? new Date(customer.lastContactAt).toLocaleDateString("zh-CN")
                : "-"}
            </div>
            <div>
              <span className="text-slate-500">下次跟进：</span>
              {customer.nextFollowUpAt
                ? new Date(customer.nextFollowUpAt).toLocaleDateString("zh-CN")
                : "-"}
            </div>
            <div><span className="text-slate-500">唤醒次数：</span>{customer.wakeUpCount}</div>
          </div>
          {customer.remark && (
            <div className="pt-2 border-t border-slate-100">
              <div className="text-slate-500 mb-1">备注</div>
              <p className="whitespace-pre-wrap text-slate-700">{customer.remark}</p>
            </div>
          )}
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-6">
          <h2 className="mb-3 font-medium text-slate-800">关联订单</h2>
          {customer.orders.length === 0 ? (
            <p className="text-sm text-slate-500">暂无关联订单</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {customer.orders.map((o: any) => (
                <li key={o.id} className="flex items-center justify-between">
                  <div>
                    <Link href={`/orders/${o.id}`} className="text-teal-600 hover:underline">
                      {o.orderNo}
                    </Link>
                    <span className="text-slate-500"> · {o.projectName || "无项目名"}</span>
                  </div>
                  <div className="text-xs text-slate-400">
                    {o.totalAmount ? `¥${Number(o.totalAmount).toLocaleString()}` : ""}
                    <span className="ml-2 rounded bg-slate-100 px-1 py-0.5">
                      {o.mainStatus === "IN_PRODUCTION" ? "生产中" : o.mainStatus === "COMPLETED" ? "已完成" : o.mainStatus === "PENDING_SHIPMENT" ? "待发货" : o.mainStatus || "-"}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-6">
          <h2 className="mb-3 font-medium text-slate-800">报价历史</h2>
          {!customer.quotes || customer.quotes.length === 0 ? (
            <p className="text-sm text-slate-500">暂无报价记录</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {(customer.quotes as any[]).map((q: any) => (
                <li key={q.id} className="flex items-center justify-between">
                  <div>
                    <Link href={`/quotes/${q.id}`} className="text-teal-600 hover:underline">
                      {q.quoteNo}
                    </Link>
                    <span className="text-slate-500 ml-2">
                      {q.status === "DRAFT" ? "草稿" : q.status === "SENT" ? "已发送" : q.status === "WON" ? "已成交" : q.status === "LOST" ? "已丢失" : q.status}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400">
                    {q.totalAmount ? `¥${Number(q.totalAmount).toLocaleString()}` : ""}
                    <span className="ml-2">{new Date(q.createdAt).toLocaleDateString("zh-CN")}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <FollowUpTimeline customerId={customer.id} />

      <CustomerAttachments customerId={customer.id} />

      <RecordingPanel
        customerId={customer.id}
        recordings={serializeForClient(customer.recordings) as unknown as RecordingItem[]}
        aiConfigured={isAiConfigured()}
      />
    </div>
  );
}
