/**
 * 线索开发节奏：列表筛选、Dashboard 统计、行内 badge 共用逻辑
 */

import { daysAgo, endOfLocalDay } from "@/lib/export/follow-up";

export type LeadPaceFilter = "never" | "due" | "stuck";

export interface LeadPaceInput {
  status: string;
  lastContactAt: Date | string | null;
  nextFollowUpAt?: Date | string | null;
  contactCount: number;
}

const ACTIVE_STATUSES = ["converted", "invalid"] as const;

export function isActiveLeadStatus(status: string): boolean {
  return !ACTIVE_STATUSES.includes(status as (typeof ACTIVE_STATUSES)[number]);
}

export function daysSinceLastContact(lastContactAt: Date | string | null): number | null {
  if (!lastContactAt) return null;
  const t = typeof lastContactAt === "string" ? new Date(lastContactAt).getTime() : lastContactAt.getTime();
  return Math.floor((Date.now() - t) / (24 * 3600 * 1000));
}

/** 按联系轮次建议的跟进间隔（天）：首次联系后 3 天也要再跟 */
export function expectedFollowUpDays(contactCount: number): number {
  if (contactCount <= 1) return 3;
  if (contactCount === 2) return 7;
  if (contactCount === 3) return 14;
  return 30;
}

function hasDate(value: Date | string | null | undefined): value is Date | string {
  return value != null && value !== "";
}

export function isLeadFollowUpDue(lead: LeadPaceInput, now = new Date()): boolean {
  if (!isActiveLeadStatus(lead.status) || !lead.lastContactAt) return false;
  if (hasDate(lead.nextFollowUpAt)) {
    return new Date(lead.nextFollowUpAt).getTime() < endOfLocalDay(now).getTime();
  }
  const days = daysSinceLastContact(lead.lastContactAt);
  return days != null && days >= expectedFollowUpDays(lead.contactCount);
}

export function matchesLeadPace(lead: LeadPaceInput, pace: LeadPaceFilter, now = new Date()): boolean {
  if (!isActiveLeadStatus(lead.status)) return false;
  const days = daysSinceLastContact(lead.lastContactAt);

  if (pace === "never") return lead.lastContactAt == null;
  if (pace === "due") return isLeadFollowUpDue(lead, now);
  if (pace === "stuck") {
    if (lead.lastContactAt == null || days == null) return false;
    return lead.contactCount >= 3 && days >= 14;
  }
  return false;
}

function dueWithoutScheduledFollowUp(now: Date): Record<string, unknown> {
  return {
    AND: [
      { OR: [{ nextFollowUpAt: null }] },
      {
        OR: [
          { AND: [{ contactCount: { lte: 1 } }, { lastContactAt: { lt: daysAgo(3, now) } }] },
          { AND: [{ contactCount: 2 }, { lastContactAt: { lt: daysAgo(7, now) } }] },
          { AND: [{ contactCount: 3 }, { lastContactAt: { lt: daysAgo(14, now) } }] },
          { AND: [{ contactCount: { gte: 4 } }, { lastContactAt: { lt: daysAgo(30, now) } }] },
        ],
      },
    ],
  };
}

export function buildLeadPacePrismaWhere(
  pace: LeadPaceFilter,
  base: { status?: unknown } = {},
  now = new Date(),
): Record<string, unknown> {
  const statusFilter = base.status ?? { notIn: [...ACTIVE_STATUSES] };

  if (pace === "never") {
    return { status: statusFilter, lastContactAt: null };
  }

  const fourteenDaysAgo = daysAgo(14, now);

  if (pace === "due") {
    return {
      AND: [
        { status: statusFilter },
        { lastContactAt: { not: null } },
        {
          OR: [
            { nextFollowUpAt: { lt: endOfLocalDay(now) } },
            dueWithoutScheduledFollowUp(now),
          ],
        },
      ],
    };
  }

  return {
    status: statusFilter,
    contactCount: { gte: 3 },
    lastContactAt: { lte: fourteenDaysAgo },
  };
}

export function getLeadPaceBadge(lead: LeadPaceInput, now = new Date()): { label: string; className: string } {
  if (lead.status === "converted") {
    return { label: "已转化", className: "bg-green-50 text-green-700" };
  }
  if (lead.status === "invalid") {
    return { label: "无效", className: "bg-slate-100 text-slate-500" };
  }
  if (!lead.lastContactAt) {
    return { label: "未联系", className: "bg-slate-100 text-slate-600" };
  }
  if (isLeadFollowUpDue(lead, now)) {
    return { label: "今天该联系", className: "bg-amber-50 text-amber-700" };
  }

  const days = daysSinceLastContact(lead.lastContactAt) ?? 0;
  if (days <= 1) {
    return { label: "今日刚跟", className: "bg-emerald-50 text-emerald-700" };
  }
  if (lead.contactCount === 1) {
    return { label: "首轮已联系", className: "bg-blue-50 text-blue-700" };
  }
  return { label: `${days} 天前`, className: "bg-slate-100 text-slate-600" };
}
