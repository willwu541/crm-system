import {
  PROJECT_CONFIDENCE,
  PROJECT_ENTRY_STATUSES,
  PROJECT_INDUSTRIES,
  PROJECT_PARTY_ROLES,
  PROJECT_PROGRESS_MARKS,
  PROJECT_STAGES,
} from "@/lib/export-constants";
import { isProjectStatus, projectLifecycleWhere } from "./project-lifecycle";
import { projectFollowUpDueWhere } from "./project-follow-up-due";
import { sourceUpdatedWhere } from "./source-updated-at";
import {
  isProjectListSortBy,
  parseOptionalNumber,
  parseScheduleBoundParam,
} from "./project-schedule-value";

function oneOf(list: readonly string[], value: string | undefined): value is string {
  return Boolean(value) && list.includes(value!);
}

export type ProjectListScope = {
  tenantId: string;
  userId: string;
  /** 管理者看全部；其他人只看自己的。 */
  manageAll: boolean;
};

/** 与项目列表同一套查询参数（导出用）。金额、完工走 projectValueWan / scheduleEndKey 列。 */
export function buildProjectListWhere(
  scope: ProjectListScope,
  searchParams: URLSearchParams,
  now = new Date(),
): Record<string, unknown> {
  const get = (key: string) => searchParams.get(key)?.trim() || undefined;
  const status = get("status");
  const where: Record<string, unknown> = {
    tenantId: scope.tenantId,
    ...(scope.manageAll ? {} : { ownerId: scope.userId }),
    ...projectLifecycleWhere(get("lifecycle"), status),
  };
  const and: Record<string, unknown>[] = [];

  if (status && isProjectStatus(status)) where.status = status;
  const stage = get("stage");
  if (oneOf(PROJECT_STAGES, stage)) where.stage = stage;
  const industry = get("industry");
  if (oneOf(PROJECT_INDUSTRIES, industry)) where.industry = industry;
  const confidence = get("confidence");
  if (oneOf(PROJECT_CONFIDENCE, confidence)) where.confidence = confidence;
  const country = get("country");
  if (country) where.country = country;
  const entryStatus = get("entryStatus");
  if (oneOf(PROJECT_ENTRY_STATUSES, entryStatus)) where.entryStatus = entryStatus;

  const ownerId = get("ownerId");
  if (get("assignment") === "unassigned") {
    where.ownerId = scope.manageAll ? null : { in: [] as string[] };
  } else if (ownerId && scope.manageAll) {
    where.ownerId = ownerId;
  }

  const progressMark = get("progressMark");
  if (progressMark === "unset") where.progressMark = null;
  else if (oneOf(PROJECT_PROGRESS_MARKS, progressMark)) where.progressMark = progressMark;

  const updated = sourceUpdatedWhere(get("sourceUpdated"), now);
  if (updated) where.sourceUpdatedAt = updated;

  const followUp = projectFollowUpDueWhere(get("followUpDue"), now);
  if (followUp) where.nextFollowUpAt = followUp;

  const role = get("role");
  if (oneOf(PROJECT_PARTY_ROLES, role)) and.push({ parties: { some: { role } } });

  const valueMin = parseOptionalNumber(get("valueMin"));
  const valueMax = parseOptionalNumber(get("valueMax"));
  if (valueMin != null || valueMax != null) {
    where.projectValueWan = {
      ...(valueMin != null ? { gte: valueMin } : {}),
      ...(valueMax != null ? { lte: valueMax } : {}),
    };
  }
  const endFrom = parseScheduleBoundParam(get("scheduleEndFrom"), "from");
  const endTo = parseScheduleBoundParam(get("scheduleEndTo"), "to");
  if (endFrom != null || endTo != null) {
    where.scheduleEndKey = {
      ...(endFrom != null ? { gte: endFrom } : {}),
      ...(endTo != null ? { lte: endTo } : {}),
    };
  }

  const keyword = get("keyword");
  if (keyword) {
    and.push({
      OR: [
        { name: { contains: keyword, mode: "insensitive" } },
        { sourceProjectNumber: { contains: keyword, mode: "insensitive" } },
        { city: { contains: keyword, mode: "insensitive" } },
        { location: { contains: keyword, mode: "insensitive" } },
        { ownerOperator: { contains: keyword, mode: "insensitive" } },
        { generalContractor: { contains: keyword, mode: "insensitive" } },
        { parties: { some: { companyName: { contains: keyword, mode: "insensitive" } } } },
      ],
    });
  }
  if (and.length) where.AND = and;
  return where;
}

export function buildProjectListOrderBy(searchParams: URLSearchParams): Record<string, unknown>[] {
  const raw = searchParams.get("sortBy") ?? "updatedAt";
  const sortBy = isProjectListSortBy(raw) ? raw : "updatedAt";
  const sort = searchParams.get("sortOrder") === "asc" ? "asc" : "desc";
  if (sortBy === "projectValue") return [{ projectValueWan: { sort, nulls: "last" } }, { id: "asc" }];
  if (sortBy === "scheduleEnd") return [{ scheduleEndKey: { sort, nulls: "last" } }, { id: "asc" }];
  if (sortBy === "bidDeadline" || sortBy === "country") {
    return [{ [sortBy]: { sort, nulls: "last" } }, { id: "asc" }];
  }
  return [{ [sortBy]: sort }, { id: "asc" }];
}
