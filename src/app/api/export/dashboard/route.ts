import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireExportSession } from "@/lib/export/auth";
import { buildLeadPacePrismaWhere } from "@/lib/export/lead-pace";

export async function GET() {
  const { ctx, error } = await requireExportSession();
  if (error) return error;

  const baseWhere = { tenantId: ctx!.tenantId, ...ctx!.ownerFilter };
  const customerWhere = ctx!.ownerFilter
    ? { tenantId: ctx!.tenantId, ownerId: ctx!.ownerFilter.ownerId }
    : { tenantId: ctx!.tenantId };

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
  const weekStart = new Date(now);
  weekStart.setDate(weekStart.getDate() - 7);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

  const leadBase = { tenantId: ctx!.tenantId, ...(ctx!.ownerFilter ?? {}) };

  const [
    todayFollowUpCount,
    overdueFollowUpCount,
    leadsNeverCount,
    leadsDueCount,
    leadsStuckCount,
    leadsThisWeek,
    quotesThisMonth,
    ordersThisMonth,
    customerStatusStats,
    countryStats,
    ownerStats,
    quoteCandidates,
    tasksOverdue,
    todayDueTasksCount,
  ] = await Promise.all([
    prisma.exportCustomer.count({
      where: {
        ...baseWhere,
        nextFollowUpAt: { gte: todayStart, lt: todayEnd },
        status: { notIn: ["won", "lost"] },
      },
    }),
    prisma.exportCustomer.count({
      where: {
        ...baseWhere,
        status: { notIn: ["won", "lost"] },
        OR: [
          { lastFollowUpAt: { lt: sevenDaysAgo } },
          { lastFollowUpAt: null, createdAt: { lt: sevenDaysAgo } },
        ],
      },
    }),
    prisma.exportLead.count({ where: { ...leadBase, ...buildLeadPacePrismaWhere("never") } }),
    prisma.exportLead.count({ where: { ...leadBase, ...buildLeadPacePrismaWhere("due") } }),
    prisma.exportLead.count({ where: { ...leadBase, ...buildLeadPacePrismaWhere("stuck") } }),
    prisma.exportLead.count({
      where: { ...leadBase, createdAt: { gte: weekStart } },
    }),
    prisma.exportQuote.count({
      where: { tenantId: ctx!.tenantId, customer: customerWhere, createdAt: { gte: monthStart } },
    }),
    prisma.exportOrder.count({
      where: { tenantId: ctx!.tenantId, customer: customerWhere, createdAt: { gte: monthStart } },
    }),
    prisma.exportCustomer.groupBy({
      by: ["status"],
      where: baseWhere,
      _count: true,
    }),
    prisma.exportCustomer.groupBy({
      by: ["country"],
      where: { ...baseWhere, country: { not: null } },
      _count: true,
    }),
    prisma.exportCustomer.groupBy({
      by: ["ownerId"],
      where: baseWhere,
      _count: true,
    }),
    prisma.exportQuote.findMany({
      where: {
        tenantId: ctx!.tenantId,
        customer: customerWhere,
        status: "sent",
        createdAt: { lt: threeDaysAgo },
      },
      select: {
        id: true,
        quoteNo: true,
        createdAt: true,
        customer: { select: { id: true, companyName: true, lastFollowUpAt: true } },
      },
      orderBy: { createdAt: "asc" },
      take: 50,
    }),
    prisma.exportTask.count({
      where: {
        ...baseWhere,
        status: { in: ["todo", "in_progress"] },
        dueDate: { lt: todayStart },
      },
    }),
    prisma.exportTask.count({
      where: {
        ...baseWhere,
        status: { in: ["todo", "in_progress"] },
        dueDate: { gte: todayStart, lt: todayEnd },
      },
    }),
  ]);

  const quoteNoFollowUp3Days = quoteCandidates
    .filter((q) => {
      const follow = q.customer.lastFollowUpAt;
      return !follow || follow < q.createdAt;
    })
    .slice(0, 20)
    .map((q) => ({
      id: q.id,
      quoteNo: q.quoteNo,
      companyName: q.customer.companyName,
      customerId: q.customer.id,
    }));

  const owners = await prisma.user.findMany({
    where: { id: { in: ownerStats.map((o) => o.ownerId) }, tenant: "export" },
    select: { id: true, name: true },
  });
  const ownerMap = Object.fromEntries(owners.map((o) => [o.id, o.name]));

  return NextResponse.json({
    data: {
      todayFollowUpCount,
      overdueFollowUpCount,
      leadsNeverCount,
      leadsDueCount,
      leadsStuckCount,
      leadsThisWeek,
      quotesThisMonth,
      ordersThisMonth,
      customerStatusStats: customerStatusStats.map((s) => ({ status: s.status, count: s._count })),
      countryStats: countryStats
        .filter((c) => c.country)
        .map((s) => ({ country: s.country!, count: s._count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
      ownerStats: ownerStats.map((s) => ({
        ownerId: s.ownerId,
        ownerName: ownerMap[s.ownerId] ?? "未知",
        count: s._count,
      })),
      quoteNoFollowUp3Days,
      tasksOverdue,
      todayDueTasksCount,
    },
  });
}
