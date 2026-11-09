import { formatRole } from "@/lib/role-labels";
import { activityTypeLabel } from "@/lib/export-display-labels";
import { startOfLocalDay } from "@/lib/export/lead-pool";

const DELETION_LABEL: Record<string, string> = {
  lead: "线索",
  customer: "客户",
  contact: "联系人",
  activity: "跟进",
  quote: "报价",
  order: "订单",
  task: "任务",
  project: "项目",
  project_party: "项目联系人",
};

export type TodayStaff = {
  id: string;
  name: string;
  role: string;
  isActive: boolean;
};

export type TodayActionInput = {
  id: string;
  userId: string;
  userName: string;
  role: string;
  director: boolean;
  at: Date;
  text: string;
  href: string | null;
};

export type TodayAction = {
  id: string;
  at: string;
  text: string;
  href: string | null;
};

export type TodayPerson = {
  userId: string;
  name: string;
  roleLabel: string;
  count: number;
  idle: boolean;
  actions: TodayAction[];
};

/** 业务员、经理，以及被设为业务经理的在职账号。管理者本人不占空位。 */
export function isTodayStaff(user: TodayStaff, directorUserId: string | null) {
  if (!user.isActive) return false;
  if (user.role === "SALES" || user.role === "MANAGER") return true;
  return Boolean(directorUserId && user.id === directorUserId);
}

export function todayRange(now = new Date()) {
  const start = startOfLocalDay(now);
  return { start, end: new Date(start.getTime() + 24 * 60 * 60 * 1000) };
}

export function formatTodayLabel(now = new Date()) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(now);
}

export function clipText(value: string | null | undefined, max = 42) {
  const text = (value ?? "").replace(/\s+/g, " ").trim();
  if (!text) return "";
  if (text.length <= max) return text;
  return `${text.slice(0, max)}…`;
}

export function joinParts(parts: Array<string | null | undefined>) {
  return parts
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part))
    .join(" · ");
}

export function claimActionText(company: string | null | undefined) {
  return joinParts(["认领线索", company]);
}

export function assignActionText(assigneeName: string, company: string | null | undefined) {
  return joinParts([`分配线索给${assigneeName}`, company]);
}

export function activityActionText(input: {
  type: string;
  company?: string | null;
  feedback?: string | null;
  content?: string | null;
}) {
  const note = clipText(input.feedback) || clipText(input.content);
  return joinParts([activityTypeLabel[input.type] ?? input.type, input.company, note]);
}

export function projectActionText(name: string) {
  return joinParts(["新建项目", name]);
}

export function partyActionText(projectName: string, companyName: string) {
  return joinParts(["记下联系人", projectName, companyName]);
}

export function customerActionText(companyName: string) {
  return joinParts(["新建客户", companyName]);
}

export function deletionActionText(entityType: string, summary?: string | null) {
  const label = DELETION_LABEL[entityType] ?? "记录";
  return joinParts([`删除${label}`, clipText(summary, 48)]);
}

export function buildTodaySummary(
  staff: Array<TodayStaff & { director: boolean }>,
  actions: TodayActionInput[],
): TodayPerson[] {
  const byUser = new Map<string, TodayActionInput[]>();
  for (const action of actions) {
    const list = byUser.get(action.userId) ?? [];
    list.push(action);
    byUser.set(action.userId, list);
  }

  const people = new Map<string, { id: string; name: string; role: string; director: boolean }>();
  for (const person of staff) {
    people.set(person.id, person);
  }
  for (const action of actions) {
    if (people.has(action.userId)) continue;
    people.set(action.userId, {
      id: action.userId,
      name: action.userName,
      role: action.role,
      director: action.director,
    });
  }

  const rows = [...people.values()].map((person) => {
    const list = (byUser.get(person.id) ?? [])
      .slice()
      .sort((a, b) => b.at.getTime() - a.at.getTime() || a.id.localeCompare(b.id));
    return {
      userId: person.id,
      name: person.name,
      roleLabel: formatRole(person.role, person.director),
      count: list.length,
      idle: list.length === 0,
      actions: list.map((action) => ({
        id: action.id,
        at: action.at.toISOString(),
        text: action.text,
        href: action.href,
      })),
    };
  });

  rows.sort((a, b) => {
    if (a.idle !== b.idle) return a.idle ? 1 : -1;
    if (b.count !== a.count) return b.count - a.count;
    return a.name.localeCompare(b.name, "zh");
  });
  return rows;
}
