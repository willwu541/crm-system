/**
 * 线索开发节奏：列表筛选、Dashboard 统计、行内 badge 共用逻辑
 */

export type LeadPaceFilter = "never" | "due" | "stuck";

export interface LeadPaceInput {
  status: string;
  lastContactAt: Date | string | null;
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

/** 按联系轮次建议的跟进间隔（天） */
export function expectedFollowUpDays(contactCount: number): number {
  if (contactCount <= 1) return 3;
  if (contactCount === 2) return 7;
  if (contactCount === 3) return 14;
  return 30;
}

export function matchesLeadPace(lead: LeadPaceInput, pace: LeadPaceFilter): boolean {
  if (!isActiveLeadStatus(lead.status)) return false;
  const days = daysSinceLastContact(lead.lastContactAt);

  if (pace === "never") return lead.lastContactAt == null;

  if (pace === "due") {
    if (lead.lastContactAt == null) return false;
    // 新规则：联系 1 次不进入「该跟进」，2 次及以上统一进入该筛选
    return lead.contactCount >= 2;
  }

  if (pace === "stuck") {
    if (lead.lastContactAt == null || days == null) return false;
    return lead.contactCount >= 3 && days >= 14;
  }

  return false;
}

export function buildLeadPacePrismaWhere(
  pace: LeadPaceFilter,
  base: { status?: unknown } = {},
): Record<string, unknown> {
  const statusFilter = base.status ?? { notIn: [...ACTIVE_STATUSES] };

  if (pace === "never") {
    return { status: statusFilter, lastContactAt: null };
  }

  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

  if (pace === "due") {
    return {
      AND: [
        { status: statusFilter },
        { lastContactAt: { not: null } },
        { contactCount: { gte: 2 } },
      ],
    };
  }

  return {
    status: statusFilter,
    contactCount: { gte: 3 },
    lastContactAt: { lte: fourteenDaysAgo },
  };
}

export function getLeadPaceBadge(lead: LeadPaceInput): { label: string; className: string } {
  if (lead.status === "converted") {
    return { label: "已转化", className: "bg-green-50 text-green-700" };
  }
  if (lead.status === "invalid") {
    return { label: "无效", className: "bg-slate-100 text-slate-500" };
  }
  if (!lead.lastContactAt) {
    return { label: "未联系", className: "bg-slate-100 text-slate-600" };
  }
  if (lead.contactCount === 1) {
    return { label: "首轮已联系", className: "bg-blue-50 text-blue-700" };
  }

  const days = daysSinceLastContact(lead.lastContactAt) ?? 0;
  const expected = expectedFollowUpDays(lead.contactCount);

  if (days >= expected * 2) {
    return { label: `${days} 天未跟`, className: "bg-red-50 text-red-700" };
  }
  if (days >= expected) {
    return { label: `该跟进 (${days}天)`, className: "bg-amber-50 text-amber-700" };
  }
  if (days <= 1) {
    return { label: "今日刚跟", className: "bg-emerald-50 text-emerald-700" };
  }
  return { label: `${days} 天前`, className: "bg-slate-100 text-slate-600" };
}
