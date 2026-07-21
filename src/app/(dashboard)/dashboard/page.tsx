import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { customerOwnerFilter } from "@/lib/domestic/customer-access";
import { REACTIVATION_STATUSES } from "@/lib/domestic/constants";
import { DEFAULT_DORMANT_DAYS, getDormantThresholdDate } from "@/lib/domestic/reactivation";
import { TodayFollowUps } from "@/components/dashboard/TodayFollowUps";
import { serializeForClient } from "@/lib/utils";

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
  const customerWhere = customerOwnerFilter(user);
  const dormantThreshold = getDormantThresholdDate(DEFAULT_DORMANT_DAYS);

  const [
    totalOrders,
    byStatus,
    byMainStatus,
    withQuoteLinks,
    withQuotes,
    hasSelectedSupplier,
    recentOrders,
    totalCustomers,
    dormantCustomers,
    pendingAnalysis,
    totalLeads,
    poolCustomers,
    activeQuotes,
    myTasks,
    todayFollowUps,
    todayFollowUpCount,
    inProduction,
    pendingShipments,
    monthPerformance,
    yearPerformance,
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
    prisma.customer.count({ where: customerWhere }),
    prisma.customer.count({
      where: {
        ...customerWhere,
        status: { in: REACTIVATION_STATUSES },
        OR: [
          { lastContactAt: { lt: dormantThreshold } },
          { lastContactAt: null, createdAt: { lt: dormantThreshold } },
        ],
      },
    }),
    prisma.callRecording.count({
      where: {
        analysisStatus: { in: ["PENDING", "FAILED"] },
        customer: customerWhere,
      },
    }),
    // 新增统计
    prisma.lead.count({
      where: { ...(user.role === "SALES" ? { ownerId: user.id } : {}) },
    }),
    prisma.customer.count({
      where: { isInPool: true },
    }),
    prisma.customerQuote.count({
      where: {
        ...(user.role === "SALES" ? { createdById: user.id } : {}),
        status: { notIn: ["WON", "LOST"] },
      },
    }),
    prisma.task.count({
      where: {
        ownerId: user.id,
        status: "todo",
      },
    }),
    prisma.customer.findMany({
      where: {
        ...customerWhere,
        nextFollowUpAt: { lte: new Date() },
      },
      select: { id: true, name: true, contactName: true, contactPhone: true, nextFollowUpAt: true, lastContactAt: true, isInPool: true },
      orderBy: { nextFollowUpAt: "asc" },
      take: 20,
    }),
    prisma.customer.count({
      where: {
        ...customerWhere,
        nextFollowUpAt: { lte: new Date() },
      },
    }),
    prisma.order.count({
      where: { ...where, mainStatus: "IN_PRODUCTION" },
    }),
    prisma.order.count({
      where: { ...where, mainStatus: "PENDING_SHIPMENT" },
    }),
    // 我的业绩：本月成交
    prisma.order.aggregate({
      where: {
        ...where,
        createdAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
        mainStatus: { in: ["CONVERTED", "IN_PRODUCTION", "PENDING_SHIPMENT", "COMPLETED"] },
      },
      _sum: { finalPrice: true },
      _count: true,
    }),
    // 本年累计
    prisma.order.aggregate({
      where: {
        ...where,
        createdAt: { gte: new Date(new Date().getFullYear(), 0, 1) },
        mainStatus: { in: ["CONVERTED", "IN_PRODUCTION", "PENDING_SHIPMENT", "COMPLETED"] },
      },
      _sum: { finalPrice: true },
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

      {/* 快捷卡片 */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link href="/leads" className="rounded-lg bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 p-5 hover:shadow-md transition-shadow">
          <div className="text-3xl font-bold text-blue-700">{totalLeads}</div>
          <div className="text-sm text-slate-600 mt-1">线索总数</div>
          <div className="text-xs text-blue-600 mt-2">查看管理 →</div>
        </Link>
        <Link href="/quotes" className="rounded-lg bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 p-5 hover:shadow-md transition-shadow">
          <div className="text-3xl font-bold text-purple-700">{activeQuotes}</div>
          <div className="text-sm text-slate-600 mt-1">进行中的报价</div>
          <div className="text-xs text-purple-600 mt-2">查看管理 →</div>
        </Link>
        <Link href="/seapool" className="rounded-lg bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200 p-5 hover:shadow-md transition-shadow">
          <div className="text-3xl font-bold text-amber-700">{poolCustomers}</div>
          <div className="text-sm text-slate-600 mt-1">公海客户</div>
          <div className="text-xs text-amber-600 mt-2">去认领 →</div>
        </Link>
        <Link href="/orders" className="rounded-lg bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200 p-5 hover:shadow-md transition-shadow">
          <div className="text-3xl font-bold text-emerald-700">{inProduction}</div>
          <div className="text-sm text-slate-600 mt-1">生产中</div>
          <div className="text-xs text-emerald-600 mt-2">查看订单 →</div>
        </Link>
        <Link href="/orders" className="rounded-lg bg-gradient-to-br from-sky-50 to-sky-100 border border-sky-200 p-5 hover:shadow-md transition-shadow">
          <div className="text-3xl font-bold text-sky-700">{pendingShipments}</div>
          <div className="text-sm text-slate-600 mt-1">待发货</div>
          <div className="text-xs text-sky-600 mt-2">准备物流 →</div>
        </Link>
        <Link href="/tasks" className="rounded-lg bg-gradient-to-br from-rose-50 to-rose-100 border border-rose-200 p-5 hover:shadow-md transition-shadow">
          <div className="text-3xl font-bold text-rose-700">{myTasks}</div>
          <div className="text-sm text-slate-600 mt-1">我的待办</div>
          <div className="text-xs text-rose-600 mt-2">去处理 →</div>
        </Link>
      </div>

      {/* 我的业绩 */}
      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="mb-4 font-medium text-slate-800">
          {user.role === "SALES" ? "我的业绩" : "全员业绩"}
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200 p-5">
            <div className="text-3xl font-bold text-emerald-700">
              ¥{Number(monthPerformance._sum.finalPrice || 0).toLocaleString()}
            </div>
            <div className="text-sm text-slate-600 mt-1">本月成交额</div>
            <div className="text-xs text-emerald-600 mt-2">{monthPerformance._count} 个订单</div>
          </div>
          <div className="rounded-lg bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200 p-5">
            <div className="text-3xl font-bold text-orange-700">
              ¥{Number(yearPerformance._sum.finalPrice || 0).toLocaleString()}
            </div>
            <div className="text-sm text-slate-600 mt-1">本年累计</div>
            <div className="text-xs text-orange-600 mt-2">{new Date().getFullYear()} 年</div>
          </div>
          <div className="rounded-lg bg-gradient-to-br from-indigo-50 to-indigo-100 border border-indigo-200 p-5">
            <div className="text-3xl font-bold text-indigo-700">{inProduction}</div>
            <div className="text-sm text-slate-600 mt-1">生产中订单</div>
            <div className="text-xs text-indigo-600 mt-2">{pendingShipments} 待发货</div>
          </div>
        </div>
      </div>

      {/* 今日待跟进 */}
      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-medium text-slate-800">今日待跟进 <span className="text-sm font-normal text-slate-500">({todayFollowUpCount}个客户)</span></h2>
        </div>
        {todayFollowUps.length === 0 && todayFollowUpCount === 0 ? (
          <p className="text-sm text-slate-400">今天没有需要跟进的客户，干得漂亮！</p>
        ) : (
          <TodayFollowUps data={serializeForClient(todayFollowUps) as any} />
        )}
      </div>

      {/* 客户与私域 */}
      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-medium text-slate-800">客户与私域</h2>
          <Link href="/customers/reactivation" className="text-sm text-teal-600 hover:underline">
            进入私域唤醒 →
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg bg-teal-50 p-4">
            <div className="text-2xl font-semibold text-teal-700">{totalCustomers}</div>
            <div className="text-sm text-slate-500">客户总数</div>
          </div>
          <div className="rounded-lg bg-amber-50 p-4">
            <div className="text-2xl font-semibold text-amber-700">{dormantCustomers}</div>
            <div className="text-sm text-slate-500">待唤醒客户（≥{DEFAULT_DORMANT_DAYS}天未联系）</div>
          </div>
          <div className="rounded-lg bg-blue-50 p-4">
            <div className="text-2xl font-semibold text-blue-700">{pendingAnalysis}</div>
            <div className="text-sm text-slate-500">待分析录音</div>
          </div>
          <Link
            href="/customers/new"
            className="flex items-center justify-center rounded-lg border border-dashed border-teal-300 bg-teal-50/50 p-4 text-sm text-teal-700 hover:bg-teal-50"
          >
            + 新建客户
          </Link>
        </div>
      </div>

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
