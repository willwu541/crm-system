import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const STATUS_MAP: Record<string, string> = {
  DRAFT: "草稿",
  PUBLISHED: "已发布",
  CLOSED: "已关闭",
};

const MAIN_STATUS_MAP: Record<string, string> = {
  CONVERTED: "已成交",
  IN_PRODUCTION: "生产中",
  PENDING_SHIPMENT: "待发货",
  COMPLETED: "已完成",
  CANCELLED: "已取消",
};

export default async function DashboardPage() {
  const user = await getSession();
  if (!user) redirect("/login");

  const where = user.role === "SALES" ? { createdById: user.id } : {};

  const [
    totalOrders,
    byStatus,
    byMainStatus,
    withQuoteLinks,
    withQuotes,
    hasSelectedSupplier,
    recentOrders,
  ] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.groupBy({
      by: ["status"],
      where,
      _count: true,
    }),
    prisma.order.groupBy({
      by: ["mainStatus"],
      where: { ...where, mainStatus: { not: null } },
      _count: true,
    }),
    prisma.order.count({
      where: {
        ...where,
        quoteLinks: { some: {} },
      },
    }),
    prisma.order.count({
      where: {
        ...where,
        quotes: { some: {} },
      },
    }),
    prisma.order.count({
      where: {
        ...where,
        hasSelectedSupplier: true,
      },
    }),
    prisma.order.findMany({
      where,
      select: {
        id: true,
        orderNo: true,
        projectName: true,
        status: true,
        mainStatus: true,
        hasSelectedSupplier: true,
        createdAt: true,
        createdBy: { select: { name: true } },
        _count: { select: { quotes: true, quoteLinks: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 15,
    }),
  ]);

  const statusCounts: Record<string, number> = {};
  byStatus.forEach((s) => {
    statusCounts[s.status] = s._count;
  });

  const mainStatusCounts: Record<string, number> = {};
  byMainStatus.forEach((s) => {
    if (s.mainStatus) mainStatusCounts[s.mainStatus] = s._count;
  });

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-slate-800">后台概览</h1>

      {/* 订单概况 */}
      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="mb-4 font-medium text-slate-800">订单概况</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg bg-slate-50 p-4">
            <div className="text-2xl font-semibold text-slate-800">{totalOrders}</div>
            <div className="text-sm text-slate-500">订单总数</div>
          </div>
          <div className="rounded-lg bg-amber-50 p-4">
            <div className="text-2xl font-semibold text-amber-700">
              {statusCounts.DRAFT ?? 0}
            </div>
            <div className="text-sm text-slate-500">草稿</div>
          </div>
          <div className="rounded-lg bg-teal-50 p-4">
            <div className="text-2xl font-semibold text-teal-700">
              {statusCounts.PUBLISHED ?? 0}
            </div>
            <div className="text-sm text-slate-500">已发布</div>
          </div>
          <div className="rounded-lg bg-slate-100 p-4">
            <div className="text-2xl font-semibold text-slate-600">
              {statusCounts.CLOSED ?? 0}
            </div>
            <div className="text-sm text-slate-500">已关闭</div>
          </div>
        </div>
        <div className="mt-4 border-t border-slate-100 pt-4">
          <div className="text-sm font-medium text-slate-600">进度分布</div>
          <div className="mt-2 flex flex-wrap gap-3">
            {(["CONVERTED", "IN_PRODUCTION", "PENDING_SHIPMENT", "COMPLETED", "CANCELLED"] as const).map(
              (ms) => (
                <span key={ms} className="rounded bg-slate-100 px-3 py-1 text-sm text-slate-700">
                  {MAIN_STATUS_MAP[ms]}: {mainStatusCounts[ms] ?? 0}
                </span>
              )
            )}
          </div>
        </div>
      </div>

      {/* 外放情况 */}
      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="mb-4 font-medium text-slate-800">外放情况</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg bg-teal-50 p-4">
            <div className="text-2xl font-semibold text-teal-700">{withQuoteLinks}</div>
            <div className="text-sm text-slate-500">已发加工户</div>
          </div>
          <div className="rounded-lg bg-amber-50 p-4">
            <div className="text-2xl font-semibold text-amber-700">
              {totalOrders - withQuoteLinks}
            </div>
            <div className="text-sm text-slate-500">未发加工户</div>
          </div>
          <div className="rounded-lg bg-blue-50 p-4">
            <div className="text-2xl font-semibold text-blue-700">{withQuotes}</div>
            <div className="text-sm text-slate-500">已收报价</div>
          </div>
          <div className="rounded-lg bg-green-50 p-4">
            <div className="text-2xl font-semibold text-green-700">{hasSelectedSupplier}</div>
            <div className="text-sm text-slate-500">已选定供应商</div>
          </div>
        </div>
      </div>

      {/* 最近订单 */}
      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-medium text-slate-800">最近订单</h2>
          <Link
            href="/orders"
            className="text-sm text-teal-600 hover:underline"
          >
            查看全部 →
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="px-4 py-3 text-left font-medium text-slate-700">订单号</th>
                <th className="px-4 py-3 text-left font-medium text-slate-700">项目</th>
                <th className="px-4 py-3 text-left font-medium text-slate-700">状态</th>
                <th className="px-4 py-3 text-left font-medium text-slate-700">进度</th>
                <th className="px-4 py-3 text-left font-medium text-slate-700">外放</th>
                <th className="px-4 py-3 text-left font-medium text-slate-700">报价</th>
                <th className="px-4 py-3 text-left font-medium text-slate-700">创建人</th>
                <th className="px-4 py-3 text-left font-medium text-slate-700">创建时间</th>
                <th className="px-4 py-3 text-left font-medium text-slate-700">操作</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-slate-500">
                    暂无订单
                  </td>
                </tr>
              ) : (
                recentOrders.map((o) => (
                  <tr key={o.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-800">{o.orderNo}</td>
                    <td className="px-4 py-3 text-slate-600">{o.projectName}</td>
                    <td className="px-4 py-3">
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                        {STATUS_MAP[o.status] ?? o.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                        {o.mainStatus ? MAIN_STATUS_MAP[o.mainStatus] : "-"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded px-2 py-0.5 text-xs ${
                          (o._count?.quoteLinks ?? 0) > 0
                            ? "bg-teal-50 text-teal-700"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {(o._count?.quoteLinks ?? 0) > 0 ? "已发" : "未发"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                        {o._count?.quotes ?? 0}家
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{o.createdBy.name}</td>
                    <td className="px-4 py-3 text-slate-500">
                      {new Date(o.createdAt).toLocaleDateString("zh-CN")}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/orders/${o.id}`}
                        className="text-teal-600 hover:underline"
                      >
                        详情
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
