import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireExportSession } from "@/lib/export/auth";

export async function GET() {
  const { ctx, error } = await requireExportSession();
  if (error) return error;

  const owners = await prisma.user.findMany({
    where: {
      tenant: "export",
      tenantId: ctx!.tenantId,
      isActive: true,
      ...(ctx!.ownerFilter ? { id: ctx!.ownerFilter.ownerId } : {}),
    },
    select: { id: true, name: true },
  });

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const rows = await Promise.all(
    owners.map(async (o) => {
      const [leadsDue, customersDue, tasksToday, tasksOverdue] = await Promise.all([
        prisma.exportLead.count({
          where: {
            tenantId: ctx!.tenantId,
            ownerId: o.id,
            status: { notIn: ["converted", "invalid"] },
            contactCount: { gte: 2 },
            lastContactAt: { lte: threeDaysAgo },
          },
        }),
        prisma.exportCustomer.count({
          where: {
            tenantId: ctx!.tenantId,
            ownerId: o.id,
            status: { notIn: ["won", "lost"] },
            OR: [{ nextFollowUpAt: { lte: now } }, { lastFollowUpAt: { lte: sevenDaysAgo } }],
          },
        }),
        prisma.exportTask.count({
          where: {
            tenantId: ctx!.tenantId,
            ownerId: o.id,
            status: { in: ["todo", "in_progress"] },
            dueDate: { gte: todayStart, lt: new Date(todayStart.getTime() + 24 * 3600 * 1000) },
          },
        }),
        prisma.exportTask.count({
          where: {
            tenantId: ctx!.tenantId,
            ownerId: o.id,
            status: { in: ["todo", "in_progress"] },
            dueDate: { lt: todayStart },
          },
        }),
      ]);
      return {
        ownerId: o.id,
        ownerName: o.name,
        leadsDue,
        customersDue,
        tasksToday,
        tasksOverdue,
      };
    }),
  );

  return NextResponse.json({ data: rows });
}

