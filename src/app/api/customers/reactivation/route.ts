import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { customerOwnerFilter } from "@/lib/domestic/customer-access";
import {
  DEFAULT_DORMANT_DAYS,
  daysSinceContact,
  getDormantThresholdDate,
  getReactivationSuggestion,
} from "@/lib/domestic/reactivation";
import { REACTIVATION_STATUSES } from "@/lib/domestic/constants";

export async function GET(request: NextRequest) {
  const user = await getSession();
  if (!user || user.tenant !== "domestic") {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const pageSize = Math.min(50, Math.max(5, parseInt(searchParams.get("pageSize") ?? "10", 10)));
  const days = Math.max(7, parseInt(searchParams.get("days") ?? String(DEFAULT_DORMANT_DAYS), 10));
  const threshold = getDormantThresholdDate(days);

  const where = {
    ...customerOwnerFilter(user),
    status: { in: REACTIVATION_STATUSES },
    OR: [
      { lastContactAt: { lt: threshold } },
      { lastContactAt: null, createdAt: { lt: threshold } },
    ],
  };

  const [customers, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      include: {
        owner: { select: { name: true } },
        _count: { select: { recordings: true, orders: true } },
      },
      orderBy: [{ lastContactAt: "asc" }, { createdAt: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.customer.count({ where }),
  ]);

  const data = customers.map((c) => {
    const daysSilent = daysSinceContact(c.lastContactAt, c.createdAt);
    return {
      ...c,
      daysSilent,
      suggestion: getReactivationSuggestion({
        name: c.name,
        wechat: c.wechat,
        daysSilent,
        wakeUpCount: c.wakeUpCount,
      }),
    };
  });

  return NextResponse.json({
    data,
    meta: { dormantDays: days, threshold: threshold.toISOString() },
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  });
}
