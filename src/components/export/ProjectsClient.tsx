"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  PROJECT_ABANDONED_STATUS,
  PROJECT_PARKED_STATUS,
  PROJECT_CONFIDENCE,
  PROJECT_INDUSTRIES,
  PROJECT_LIFECYCLES,
  PROJECT_PROGRESS_MARKS,
  PROJECT_STAGES,
  UNMARKED_PROGRESS_LABEL,
  PROJECT_UNABANDON_STATUS,
} from "@/lib/export-constants";
import {
  displayLabel,
  projectConfidenceLabel,
  projectEntryStatusLabel,
  projectIndustryLabel,
  projectLifecycleLabel,
  projectStageLabel,
} from "@/lib/export-display-labels";
import { buildListUrl } from "@/lib/export/url-params";
import { parseResponseJson } from "@/lib/parse-response-json";
import {
  displayGeneralContractor,
  displayOwnerOperator,
  displayPotentialBuyers,
  formatProjectPlace,
  projectSubtitle,
  wrapSlashLabel,
} from "@/lib/export/project-board";
import { formatSourceUpdatedAt } from "@/lib/export/source-updated-at";
import {
  PROJECT_FOLLOW_UP_DUE_MODES,
  formatShanghaiDate,
  isFollowUpOverdue,
  isProjectFollowUpDue,
  projectFollowUpDueLabel,
} from "@/lib/export/project-follow-up-due";
import { parseProjectValueWan } from "@/lib/export/project-schedule-value";
import { usePersistedListQuery } from "@/lib/export/use-persisted-list-query";
import { useToast } from "@/components/ui/Toast";
import { useExportMe } from "./use-export-me";
import { Pagination } from "./shared/Pagination";
import { CountrySelect } from "./CountrySelect";

interface ProjectRow {
  id: string;
  name: string;
  country: string | null;
  city: string | null;
  location: string | null;
  industry: string | null;
  stage: string;
  status: string;
  progressMark: string | null;
  sourceUpdatedAt: string | null;
  confidence: string;
  entryStatus: string;
  ownerOperator: string | null;
  generalContractor: string | null;
  potentialBuyers: string | null;
  source: string | null;
  notes: string | null;
  description: string | null;
  bidDeadline: string | null;
  scheduleEnd: string | null;
  projectValueText: string | null;
  projectValueWan?: number | null;
  nextFollowUpAt?: string | null;
  parties: { role: string; companyName: string }[];
  owner: { id: string; name: string } | null;
}

interface PaginationInfo {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

interface EntryCounts {
  pending: number;
  entered: number;
  all: number;
}

interface Assignee {
  id: string;
  name: string;
  roleLabel?: string;
}

function stageClass(stage: string) {
  switch (stage) {
    case "awarded":
      return "border-emerald-300 bg-emerald-50 text-emerald-800";
    case "construction":
      return "border-green-300 bg-green-50 text-green-800";
    case "tendering":
      return "border-orange-300 bg-orange-50 text-orange-800";
    case "mep_install":
      return "border-amber-300 bg-amber-50 text-amber-800";
    case "commissioning":
      return "border-teal-300 bg-teal-50 text-teal-800";
    case "delayed":
      return "border-slate-300 bg-slate-100 text-slate-600";
    case "planning":
    case "design_docs":
      return "border-sky-300 bg-sky-50 text-sky-800";
    default:
      return "border-stone-300 bg-stone-50 text-stone-600";
  }
}

function dash(value: string | null | undefined): string {
  return value?.trim() ? value : "—";
}

function formatValueWan(project: Pick<ProjectRow, "projectValueWan" | "projectValueText">): string {
  const wan = project.projectValueWan ?? parseProjectValueWan(project.projectValueText);
  if (wan == null) return dash(project.projectValueText);
  return wan.toLocaleString("zh-CN", { maximumFractionDigits: 2 });
}

const BATCH_LIMIT = 200;

function entryClass(status: string) {
  return status === "entered"
    ? "border-emerald-300 bg-emerald-50 text-emerald-800"
    : "border-amber-300 bg-amber-50 text-amber-800";
}

const ENTRY_TABS = [
  { id: "pending", label: "未录入" },
  { id: "entered", label: "已录入" },
  { id: "all", label: "全部" },
] as const;

const LIFECYCLE_TABS = PROJECT_LIFECYCLES.map((id) => ({
  id,
  label: projectLifecycleLabel[id] ?? id,
}));

export function ProjectsClient() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const stage = searchParams.get("stage") ?? "";
  const industry = searchParams.get("industry") ?? "";
  const confidence = searchParams.get("confidence") ?? "";
  const country = searchParams.get("country") ?? "";
  const lifecycleRaw = searchParams.get("lifecycle");
  const lifecycle = (PROJECT_LIFECYCLES as readonly string[]).includes(lifecycleRaw ?? "")
    ? (lifecycleRaw as (typeof PROJECT_LIFECYCLES)[number])
    : "active";
  const entryStatusRaw = searchParams.get("entryStatus");
  const entryStatus =
    entryStatusRaw === "pending" || entryStatusRaw === "entered" || entryStatusRaw === "all"
      ? entryStatusRaw
      : "entered";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const keywordParam = searchParams.get("keyword") ?? "";
  const sortBy = searchParams.get("sortBy") ?? "updatedAt";
  const sortOrder = searchParams.get("sortOrder") ?? "desc";
  const scheduleEndFrom = searchParams.get("scheduleEndFrom") ?? "";
  const scheduleEndTo = searchParams.get("scheduleEndTo") ?? "";
  const valueMinParam = searchParams.get("valueMin") ?? "";
  const valueMaxParam = searchParams.get("valueMax") ?? "";
  const assignment = searchParams.get("assignment") === "unassigned" ? "unassigned" : "";
  const ownerId = searchParams.get("ownerId") ?? "";
  const progressMark = searchParams.get("progressMark") ?? "";
  const sourceUpdated = ["1", "today", "week"].includes(searchParams.get("sourceUpdated") ?? "")
    ? (searchParams.get("sourceUpdated") as "1" | "today" | "week")
    : "";
  const followUpDueRaw = searchParams.get("followUpDue");
  const followUpDue = isProjectFollowUpDue(followUpDueRaw) ? followUpDueRaw : "";
  const { hydrated } = usePersistedListQuery("/export/projects");

  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [batchOwnerId, setBatchOwnerId] = useState("");
  const [batchAssigning, setBatchAssigning] = useState(false);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [countries, setCountries] = useState<string[]>([]);
  const [entryCounts, setEntryCounts] = useState<EntryCounts>({ pending: 0, entered: 0, all: 0 });
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState(keywordParam);
  const [valueMin, setValueMin] = useState(valueMinParam);
  const [valueMax, setValueMax] = useState(valueMaxParam);
  const [assignees, setAssignees] = useState<Assignee[]>([]);
  const [ownerOptions, setOwnerOptions] = useState<Assignee[]>([]);
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [abandoningId, setAbandoningId] = useState<string | null>(null);
  const [deferringId, setDeferringId] = useState<string | null>(null);
  const [markingId, setMarkingId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [savingUpdateId, setSavingUpdateId] = useState<string | null>(null);
  const [updateDraft, setUpdateDraft] = useState({ stage: "", note: "" });
  const { toast } = useToast();
  const me = useExportMe();
  const canManage = Boolean(me?.canAssign);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  useEffect(() => {
    setKeyword(keywordParam);
  }, [keywordParam]);

  useEffect(() => {
    setValueMin(valueMinParam);
    setValueMax(valueMaxParam);
  }, [valueMinParam, valueMaxParam]);

  function updateUrl(updates: Record<string, string | number | undefined>) {
    router.replace(
      buildListUrl(pathname, {
        stage: stage || undefined,
        industry: industry || undefined,
        confidence: confidence || undefined,
        country: country || undefined,
        lifecycle: lifecycle === "active" ? undefined : lifecycle,
        entryStatus,
        keyword: keywordParam || undefined,
        sortBy,
        sortOrder,
        scheduleEndFrom: scheduleEndFrom || undefined,
        scheduleEndTo: scheduleEndTo || undefined,
        valueMin: valueMinParam || undefined,
        valueMax: valueMaxParam || undefined,
        assignment: assignment || undefined,
        ownerId: ownerId || undefined,
        progressMark: progressMark || undefined,
        sourceUpdated: sourceUpdated || undefined,
        followUpDue: followUpDue || undefined,
        page,
        ...updates,
      }),
    );
  }

  function updateSort(value: string) {
    const [nextSortBy, nextSortOrder] = value.split(":");
    updateUrl({ sortBy: nextSortBy, sortOrder: nextSortOrder, page: 1 });
  }

  function resetFilters() {
    setKeyword("");
    setValueMin("");
    setValueMax("");
    router.replace(
      buildListUrl(pathname, {
        lifecycle: lifecycle === "active" ? undefined : lifecycle,
        entryStatus,
        sortBy: "updatedAt",
        sortOrder: "desc",
        page: 1,
      }),
    );
  }

  useEffect(() => {
    if (!canManage) return;
    let cancelled = false;
    (async () => {
      try {
        const [assignRes, ownerRes] = await Promise.all([
          fetch("/api/export/users?assignable=1"),
          fetch("/api/export/users?ownerFilter=1"),
        ]);
        const assignJson = await parseResponseJson<{ data?: Assignee[] }>(assignRes);
        const ownerJson = await parseResponseJson<{ data?: Assignee[] }>(ownerRes);
        if (cancelled) return;
        if (assignRes.ok && assignJson.data) setAssignees(assignJson.data);
        if (ownerRes.ok && ownerJson.data) setOwnerOptions(ownerJson.data);
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [canManage]);

  async function claimProject(id: string) {
    setClaimingId(id);
    try {
      const res = await fetch(`/api/export/projects/${id}/claim`, { method: "POST" });
      const json = await parseResponseJson<{
        error?: string;
        data?: { owner?: { id: string; name: string } | null };
      }>(res);
      if (!res.ok) throw new Error(json.error ?? "认领失败");
      setProjects((rows) =>
        rows.map((row) => (row.id === id ? { ...row, owner: json.data?.owner ?? row.owner } : row)),
      );
      toast("已领到你名下");
    } catch (e) {
      toast(e instanceof Error ? e.message : "认领失败", "error");
    } finally {
      setClaimingId(null);
    }
  }

  async function assignProject(id: string, userId: string) {
    setAssigningId(id);
    try {
      const res = await fetch(`/api/export/projects/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ownerId: userId }),
      });
      const json = await parseResponseJson<{
        error?: string;
        data?: { owner?: { id: string; name: string } | null };
      }>(res);
      if (!res.ok) throw new Error(json.error ?? "分配失败");
      setProjects((rows) =>
        rows.map((row) => (row.id === id ? { ...row, owner: json.data?.owner ?? null } : row)),
      );
      toast("已分配");
    } catch (e) {
      toast(e instanceof Error ? e.message : "分配失败", "error");
    } finally {
      setAssigningId(null);
    }
  }

  const filterQuery = useMemo(() => {
    const params = new URLSearchParams();
    if (stage) params.set("stage", stage);
    if (industry) params.set("industry", industry);
    if (confidence) params.set("confidence", confidence);
    if (country) params.set("country", country);
    params.set("lifecycle", lifecycle);
    if (entryStatus === "pending" || entryStatus === "entered") params.set("entryStatus", entryStatus);
    if (keywordParam) params.set("keyword", keywordParam);
    if (sortBy) params.set("sortBy", sortBy);
    if (sortOrder) params.set("sortOrder", sortOrder);
    if (scheduleEndFrom) params.set("scheduleEndFrom", scheduleEndFrom);
    if (scheduleEndTo) params.set("scheduleEndTo", scheduleEndTo);
    if (valueMinParam) params.set("valueMin", valueMinParam);
    if (valueMaxParam) params.set("valueMax", valueMaxParam);
    if (assignment) params.set("assignment", assignment);
    if (ownerId) params.set("ownerId", ownerId);
    if (progressMark) params.set("progressMark", progressMark);
    if (sourceUpdated) params.set("sourceUpdated", sourceUpdated);
    if (followUpDue) params.set("followUpDue", followUpDue);
    return params.toString();
  }, [
    stage,
    industry,
    confidence,
    country,
    lifecycle,
    entryStatus,
    keywordParam,
    sortBy,
    sortOrder,
    scheduleEndFrom,
    scheduleEndTo,
    valueMinParam,
    valueMaxParam,
    assignment,
    ownerId,
    progressMark,
    sourceUpdated,
    followUpDue,
  ]);

  useEffect(() => {
    setSelectedIds(new Set());
  }, [filterQuery, page]);

  useEffect(() => {
    if (!hydrated) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const params = new URLSearchParams(filterQuery);
        params.set("page", String(page));
        const res = await fetch(`/api/export/projects?${params}`);
        const json = await parseResponseJson<{
          error?: string;
          data?: ProjectRow[];
          pagination?: PaginationInfo;
          countries?: string[];
          entryCounts?: EntryCounts;
        }>(res);
        if (cancelled) return;
        if (!res.ok) throw new Error(json.error ?? "加载失败");
        setProjects(json.data || []);
        setPagination(json.pagination ?? null);
        setCountries(json.countries ?? []);
        setEntryCounts(json.entryCounts ?? { pending: 0, entered: 0, all: 0 });
      } catch (e) {
        if (cancelled) return;
        setProjects([]);
        setPagination(null);
        setLoadError(e instanceof Error ? e.message : "加载失败");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hydrated, page, filterQuery, reloadKey]);

  function toggleSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectPage() {
    setSelectedIds((prev) => {
      const allOnPage = projects.length > 0 && projects.every((p) => prev.has(p.id));
      const next = new Set(prev);
      for (const p of projects) {
        if (allOnPage) next.delete(p.id);
        else next.add(p.id);
      }
      return next;
    });
  }

  async function batchAssign() {
    if (!batchOwnerId) {
      toast("请选择业务员", "error");
      return;
    }
    const projectIds = [...selectedIds];
    if (projectIds.length > BATCH_LIMIT) {
      toast(`一次最多分配 ${BATCH_LIMIT} 个项目`, "error");
      return;
    }
    setBatchAssigning(true);
    try {
      const res = await fetch("/api/export/projects/batch-assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectIds, ownerId: batchOwnerId }),
      });
      const json = await parseResponseJson<{ error?: string; updated?: number; skipped?: number }>(res);
      if (!res.ok) throw new Error(json.error ?? "批量分配失败");
      toast(
        json.skipped
          ? `已分配 ${json.updated ?? 0} 个，跳过 ${json.skipped} 个（已是此人负责）`
          : `已分配 ${json.updated ?? 0} 个项目`,
      );
      setSelectedIds(new Set());
      setReloadKey((k) => k + 1);
    } catch (e) {
      toast(e instanceof Error ? e.message : "批量分配失败", "error");
    } finally {
      setBatchAssigning(false);
    }
  }

  async function changeProgressMark(project: ProjectRow, next: string) {
    if (!next || next === (project.progressMark ?? "")) return;
    setMarkingId(project.id);
    try {
      const res = await fetch(`/api/export/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ progressMark: next }),
      });
      const json = await parseResponseJson<{ error?: string }>(res);
      if (!res.ok) throw new Error(json.error ?? "标记失败");
      setProjects((rows) =>
        rows.map((row) => (row.id === project.id ? { ...row, progressMark: next } : row)),
      );
      toast("已更新进度标记");
    } catch (e) {
      toast(e instanceof Error ? e.message : "标记失败", "error");
    } finally {
      setMarkingId(null);
    }
  }

  async function toggleDeferred(project: ProjectRow) {
    const parked = project.status === PROJECT_PARKED_STATUS;
    setDeferringId(project.id);
    try {
      const res = await fetch(`/api/export/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parked ? { resumeParked: true } : { status: PROJECT_PARKED_STATUS }),
      });
      const json = await parseResponseJson<{ error?: string }>(res);
      if (!res.ok) throw new Error(json.error ?? "操作失败");
      setProjects((rows) => rows.filter((row) => row.id !== project.id));
      toast(parked ? "已取消暂缓" : "已标为暂缓开发");
    } catch (e) {
      toast(e instanceof Error ? e.message : "操作失败", "error");
    } finally {
      setDeferringId(null);
    }
  }

  async function toggleAbandoned(project: ProjectRow) {
    const abandoned = project.status === PROJECT_ABANDONED_STATUS;
    const nextStatus = abandoned ? PROJECT_UNABANDON_STATUS : PROJECT_ABANDONED_STATUS;
    setAbandoningId(project.id);
    try {
      const res = await fetch(`/api/export/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const json = await parseResponseJson<{ error?: string }>(res);
      if (!res.ok) throw new Error(json.error ?? "操作失败");
      setProjects((rows) => rows.filter((row) => row.id !== project.id));
      if (updatingId === project.id) {
        setUpdatingId(null);
        setUpdateDraft({ stage: "", note: "" });
      }
      toast(abandoned ? "已取消废弃" : "已标为废弃");
    } catch (e) {
      toast(e instanceof Error ? e.message : "操作失败", "error");
    } finally {
      setAbandoningId(null);
    }
  }

  function openUpdate(project: ProjectRow) {
    if (updatingId === project.id) {
      setUpdatingId(null);
      setUpdateDraft({ stage: "", note: "" });
      return;
    }
    setUpdatingId(project.id);
    setUpdateDraft({ stage: project.stage, note: "" });
  }

  async function saveUpdate(project: ProjectRow) {
    const note = updateDraft.note.trim();
    if (!note) {
      toast("请填写更新内容", "error");
      return;
    }
    setSavingUpdateId(project.id);
    try {
      const body: { updateNote: string; stage: string } = {
        updateNote: note,
        stage: updateDraft.stage || project.stage,
      };
      const res = await fetch(`/api/export/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await parseResponseJson<{ error?: string }>(res);
      if (!res.ok) throw new Error(json.error ?? "保存失败");
      const nextStage = body.stage;
      if (stage && stage !== nextStage) {
        setProjects((rows) => rows.filter((row) => row.id !== project.id));
      } else {
        const markedAt = new Date().toISOString();
        setProjects((rows) =>
          rows.map((row) =>
            row.id === project.id ? { ...row, stage: nextStage, sourceUpdatedAt: markedAt } : row,
          ),
        );
      }
      setUpdatingId(null);
      setUpdateDraft({ stage: "", note: "" });
      toast("更新已保存");
    } catch (e) {
      toast(e instanceof Error ? e.message : "保存失败", "error");
    } finally {
      setSavingUpdateId(null);
    }
  }

  async function toggleEntryStatus(project: ProjectRow) {
    const next = project.entryStatus === "entered" ? "pending" : "entered";
    setTogglingId(project.id);
    try {
      const res = await fetch(`/api/export/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entryStatus: next }),
      });
      const json = await parseResponseJson<{ error?: string }>(res);
      if (!res.ok) throw new Error(json.error ?? "更新失败");
      setProjects((rows) => {
        if (entryStatus === "all") {
          return rows.map((row) => (row.id === project.id ? { ...row, entryStatus: next } : row));
        }
        return rows.filter((row) => row.id !== project.id);
      });
      setEntryCounts((counts) => {
        const from = project.entryStatus === "entered" ? "entered" : "pending";
        const to = next === "entered" ? "entered" : "pending";
        return {
          ...counts,
          [from]: Math.max(0, counts[from] - 1),
          [to]: counts[to] + 1,
        };
      });
    } catch (e) {
      console.error(e);
    } finally {
      setTogglingId(null);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-1.5">
        {LIFECYCLE_TABS.map((tab) => {
          const active = lifecycle === tab.id;
          const activeClass =
            tab.id === "abandoned"
              ? "border-rose-700 bg-rose-800 text-white"
              : tab.id === "parked"
                ? "border-amber-700 bg-amber-800 text-white"
                : "border-stone-700 bg-stone-800 text-white";
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() =>
                updateUrl({
                  lifecycle: tab.id === "active" ? undefined : tab.id,
                  page: 1,
                })
              }
              className={`rounded-full border px-3 py-1 text-sm ${
                active ? activeClass : "border-stone-300 bg-white text-slate-700 hover:bg-stone-50"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
        <span className="mx-1 h-4 w-px bg-stone-300" aria-hidden />
        {ENTRY_TABS.map((tab) => {
          const active = entryStatus === tab.id;
          const count = entryCounts[tab.id];
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => updateUrl({ entryStatus: tab.id, page: 1 })}
              className={`rounded-full border px-3 py-1 text-sm ${
                active
                  ? "border-stone-700 bg-stone-800 text-white"
                  : "border-stone-300 bg-white text-slate-700 hover:bg-stone-50"
              }`}
            >
              {tab.label}
              <span className={`ml-1.5 text-xs ${active ? "text-stone-200" : "text-stone-400"}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>
      <div className="flex flex-wrap items-start gap-2">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            updateUrl({
              keyword: keyword || undefined,
              valueMin: valueMin || undefined,
              valueMax: valueMax || undefined,
              page: 1,
            });
          }}
          className="flex flex-wrap items-center gap-2"
        >
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="搜项目、公司、地点"
            className="min-w-[14rem] rounded-md border border-stone-300 bg-white px-3 py-1.5 text-sm"
          />
          <CountrySelect
            value={country}
            extraValues={countries}
            allowCustom
            emptyLabel="全部国家"
            onChange={(next) => updateUrl({ country: next || undefined, page: 1 })}
            className="min-w-[8.5rem] rounded-md border border-stone-300 px-3 py-1.5 text-sm"
          />
          <select
            value={industry}
            onChange={(e) => updateUrl({ industry: e.target.value || undefined, page: 1 })}
            className="rounded-md border border-stone-300 px-3 py-1.5 text-sm"
          >
            <option value="">全部行业</option>
            {PROJECT_INDUSTRIES.map((s) => (
              <option key={s} value={s}>
                {projectIndustryLabel[s] ?? s}
              </option>
            ))}
          </select>
          <select
            value={stage}
            onChange={(e) => updateUrl({ stage: e.target.value || undefined, page: 1 })}
            className="rounded-md border border-stone-300 px-3 py-1.5 text-sm"
          >
            <option value="">全部阶段</option>
            {PROJECT_STAGES.map((s) => (
              <option key={s} value={s}>
                {projectStageLabel[s] ?? s}
              </option>
            ))}
          </select>
          {canManage && (
            <select
              value={assignment === "unassigned" ? "unassigned" : ownerId}
              onChange={(e) => {
                const next = e.target.value;
                if (next === "unassigned") {
                  updateUrl({ assignment: "unassigned", ownerId: undefined, page: 1 });
                } else {
                  updateUrl({ assignment: undefined, ownerId: next || undefined, page: 1 });
                }
              }}
              className="rounded-md border border-stone-300 px-3 py-1.5 text-sm"
            >
              <option value="">全部业务员</option>
              <option value="unassigned">未分配</option>
              {ownerId && !ownerOptions.some((u) => u.id === ownerId) && (
                <option value={ownerId}>当前负责人</option>
              )}
              {ownerOptions.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.roleLabel ? `${u.name}（${u.roleLabel}）` : u.name}
                </option>
              ))}
            </select>
          )}
          <select
            value={progressMark}
            onChange={(e) => updateUrl({ progressMark: e.target.value || undefined, page: 1 })}
            className="rounded-md border border-stone-300 px-3 py-1.5 text-sm"
          >
            <option value="">全部进度标记</option>
            <option value="unset">{UNMARKED_PROGRESS_LABEL}</option>
            {PROJECT_PROGRESS_MARKS.map((mark) => (
              <option key={mark} value={mark}>
                {mark}
              </option>
            ))}
          </select>
          <select
            value={sourceUpdated}
            onChange={(e) => updateUrl({ sourceUpdated: e.target.value || undefined, page: 1 })}
            className="rounded-md border border-stone-300 px-3 py-1.5 text-sm"
          >
            <option value="">资料更新</option>
            <option value="today">今天更新</option>
            <option value="week">本周更新</option>
            <option value="1">更新过的</option>
          </select>
          <select
            value={followUpDue}
            onChange={(e) => updateUrl({ followUpDue: e.target.value || undefined, page: 1 })}
            className="rounded-md border border-stone-300 px-3 py-1.5 text-sm"
          >
            <option value="">下次跟进</option>
            {PROJECT_FOLLOW_UP_DUE_MODES.map((mode) => (
              <option key={mode} value={mode}>
                {projectFollowUpDueLabel[mode]}
              </option>
            ))}
          </select>
          <select
            value={confidence}
            onChange={(e) => updateUrl({ confidence: e.target.value || undefined, page: 1 })}
            className="rounded-md border border-stone-300 px-3 py-1.5 text-sm"
          >
            <option value="">全部可靠度</option>
            {PROJECT_CONFIDENCE.map((s) => (
              <option key={s} value={s}>
                {projectConfidenceLabel[s] ?? s}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-1 text-sm text-slate-600">
            <span className="whitespace-nowrap">完工从</span>
            <input
              type="month"
              value={scheduleEndFrom}
              onChange={(e) => updateUrl({ scheduleEndFrom: e.target.value || undefined, page: 1 })}
              className="rounded-md border border-stone-300 bg-white px-2 py-1.5 text-sm"
            />
          </label>
          <label className="flex items-center gap-1 text-sm text-slate-600">
            <span className="whitespace-nowrap">到</span>
            <input
              type="month"
              value={scheduleEndTo}
              onChange={(e) => updateUrl({ scheduleEndTo: e.target.value || undefined, page: 1 })}
              className="rounded-md border border-stone-300 bg-white px-2 py-1.5 text-sm"
            />
          </label>
          <label className="flex items-center gap-1 text-sm text-slate-600">
            <span className="whitespace-nowrap">金额</span>
            <input
              type="number"
              min={0}
              step="any"
              value={valueMin}
              onChange={(e) => setValueMin(e.target.value)}
              placeholder="最小万元"
              className="w-[6.5rem] rounded-md border border-stone-300 bg-white px-2 py-1.5 text-sm"
            />
            <span>—</span>
            <input
              type="number"
              min={0}
              step="any"
              value={valueMax}
              onChange={(e) => setValueMax(e.target.value)}
              placeholder="最大万元"
              className="w-[6.5rem] rounded-md border border-stone-300 bg-white px-2 py-1.5 text-sm"
            />
          </label>
          <select
            value={`${sortBy}:${sortOrder}`}
            onChange={(e) => updateSort(e.target.value)}
            className="rounded-md border border-stone-300 px-3 py-1.5 text-sm"
          >
            <option value="updatedAt:desc">最新更新</option>
            <option value="createdAt:desc">最新创建</option>
            <option value="name:asc">名称 A-Z</option>
            <option value="scheduleEnd:asc">完工时间早→晚</option>
            <option value="scheduleEnd:desc">完工时间晚→早</option>
            <option value="projectValue:desc">金额大→小</option>
            <option value="projectValue:asc">金额小→大</option>
          </select>
          <button type="submit" className="export-btn-secondary rounded-md px-3 py-1.5 text-sm">
            搜索
          </button>
          <button
            type="button"
            onClick={resetFilters}
            className="export-btn-secondary rounded-md px-3 py-1.5 text-sm"
          >
            重置筛选
          </button>
        </form>
        <div className="ml-auto flex items-center gap-2">
          <a
            href={`/api/export/projects/export?${filterQuery}`}
            download
            title="按当前筛选导出，最多 5000 条"
            className="export-btn-secondary rounded-md px-3 py-1.5 text-sm"
          >
            导出
          </a>
          {canManage && (
            <Link
              href="/export/projects/new"
              className="export-btn-primary rounded-md px-4 py-1.5 text-sm font-medium"
            >
              快速录入
            </Link>
          )}
        </div>
      </div>

      {loadError && (
        <div className="flex items-center justify-between gap-3 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">
          <span>项目加载失败：{loadError}</span>
          <button
            type="button"
            onClick={() => setReloadKey((k) => k + 1)}
            className="rounded border border-red-300 bg-white px-2.5 py-1 text-xs text-red-700 hover:bg-red-50"
          >
            重试
          </button>
        </div>
      )}

      {canManage && selectedIds.size > 0 && (
        <div className="sticky top-0 z-20 flex flex-wrap items-center gap-2 rounded-lg border border-teal-300 bg-teal-50 px-4 py-2 text-sm shadow-sm">
          <span className="font-medium text-teal-900">已选 {selectedIds.size} 个项目</span>
          <select
            value={batchOwnerId}
            onChange={(e) => setBatchOwnerId(e.target.value)}
            className="rounded-md border border-stone-300 bg-white px-2 py-1 text-sm"
          >
            <option value="">选择业务员</option>
            {assignees.map((u) => (
              <option key={u.id} value={u.id}>
                {u.roleLabel ? `${u.name}（${u.roleLabel}）` : u.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={batchAssigning || !batchOwnerId}
            onClick={batchAssign}
            className="export-btn-primary rounded-md px-3 py-1 text-sm disabled:opacity-50"
          >
            {batchAssigning ? "分配中..." : "批量分配"}
          </button>
          <button
            type="button"
            onClick={() => setSelectedIds(new Set())}
            className="export-btn-secondary rounded-md px-3 py-1 text-sm"
          >
            取消选择
          </button>
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-stone-200 bg-[#f7f1e8]">
        {loading || !hydrated ? (
          <div className="p-8 text-center text-slate-500">加载中...</div>
        ) : loadError ? (
          <div className="p-8 text-center text-slate-500">列表没加载出来，点上方「重试」。</div>
        ) : projects.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            {lifecycle === "abandoned"
              ? "没有已废弃的项目。"
              : canManage
                ? entryStatus === "entered"
                  ? "还没有已录入的项目。录完后点「已录入」，之后从这里找。"
                  : entryStatus === "pending"
                    ? "没有未录入的项目。先建一条并标成未录入，录完再点已录入。"
                    : "还没有项目。先录入碰到的项目，再分配给业务员去找联系方式。"
                : "还没有分配给你的项目。"}
          </div>
        ) : (
          <table className="w-full min-w-[66rem] text-sm">
            <thead className="sticky top-0 z-10 bg-[#f3ece3]">
              <tr className="border-b border-stone-300 text-left text-xs font-medium text-stone-500">
                {canManage && (
                  <th className="w-8 px-2 py-2.5">
                    <input
                      type="checkbox"
                      aria-label="全选本页"
                      checked={projects.length > 0 && projects.every((p) => selectedIds.has(p.id))}
                      onChange={toggleSelectPage}
                    />
                  </th>
                )}
                <th className="px-3 py-2.5">项目名称</th>
                <th className="px-2 py-2.5">国家</th>
                <th className="whitespace-nowrap px-2 py-2.5">金额(万元)</th>
                <th className="px-2 py-2.5">完工</th>
                <th className="px-2 py-2.5">阶段</th>
                <th className="px-2 py-2.5">{canManage ? "分配" : "负责人"}</th>
                <th className="px-2 py-2.5">进度标记</th>
                <th className="px-2 py-2.5">下次跟进</th>
                <th className="px-2 py-2.5">操作</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((p) => {
                const subtitle = projectSubtitle(p);
                const partiesLine = [
                  ["业主", displayOwnerOperator(p, p.parties)],
                  ["总包", displayGeneralContractor(p, p.parties)],
                  ["采购", displayPotentialBuyers(p, p.parties)],
                ]
                  .filter(([, v]) => v)
                  .map(([k, v]) => `${k}：${v}`)
                  .join(" · ");
                const metaLine = [
                  p.industry ? wrapSlashLabel(displayLabel(projectIndustryLabel, p.industry)).replaceAll("\n", " ") : "",
                  p.confidence && p.confidence !== "unknown"
                    ? `可靠度 ${displayLabel(projectConfidenceLabel, p.confidence)}`
                    : "",
                ]
                  .filter(Boolean)
                  .join(" · ");
                const followUpText = formatShanghaiDate(p.nextFollowUpAt);
                const followUpOverdue = isFollowUpOverdue(p.nextFollowUpAt);
                return (
                <Fragment key={p.id}>
                  <tr
                    className={`cursor-pointer border-b border-stone-200/80 hover:bg-white/70 ${
                      selectedIds.has(p.id) ? "bg-teal-50/60" : ""
                    }`}
                    onClick={() => router.push(`/export/projects/${p.id}`)}
                  >
                    {canManage && (
                      <td className="px-2 py-3 align-top" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          aria-label="选择项目"
                          checked={selectedIds.has(p.id)}
                          onChange={() => toggleSelected(p.id)}
                        />
                      </td>
                    )}
                    <td className="max-w-[22rem] px-3 py-3 align-top">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <div className="font-semibold text-slate-800" title={p.name}>
                          {p.name}
                        </div>
                        {p.status === PROJECT_ABANDONED_STATUS ? (
                          <span className="inline-flex rounded-full border border-rose-300 bg-rose-50 px-2 py-0.5 text-xs text-rose-800">
                            废弃
                          </span>
                        ) : null}
                        {p.status === PROJECT_PARKED_STATUS ? (
                          <span className="inline-flex rounded-full border border-amber-400 bg-amber-50 px-2 py-0.5 text-xs text-amber-900">
                            暂缓开发
                          </span>
                        ) : null}
                        {formatSourceUpdatedAt(p.sourceUpdatedAt) ? (
                          <span className="inline-flex rounded-full border border-sky-400 bg-sky-50 px-2 py-0.5 text-xs font-medium text-sky-900">
                            已更新 {formatSourceUpdatedAt(p.sourceUpdatedAt)}
                          </span>
                        ) : null}
                        <button
                          type="button"
                          disabled={togglingId === p.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleEntryStatus(p);
                          }}
                          title={p.entryStatus === "entered" ? "点一下改成未录入" : "点一下改成已录入"}
                          className={`inline-flex rounded-full border px-2 py-0.5 text-xs disabled:opacity-60 ${entryClass(p.entryStatus)}`}
                        >
                          {displayLabel(projectEntryStatusLabel, p.entryStatus || "pending")}
                        </button>
                      </div>
                      {metaLine ? <div className="mt-0.5 text-xs text-stone-500">{metaLine}</div> : null}
                      {partiesLine ? (
                        <div className="mt-0.5 line-clamp-1 text-xs text-slate-600" title={partiesLine}>
                          {partiesLine}
                        </div>
                      ) : null}
                      {subtitle ? (
                        <div className="mt-0.5 line-clamp-1 text-xs font-normal text-stone-500" title={subtitle}>
                          {subtitle}
                        </div>
                      ) : null}
                    </td>
                    <td className="max-w-[9rem] whitespace-pre-line px-2 py-3 align-top leading-5 text-slate-700">
                      {formatProjectPlace(p)}
                    </td>
                    <td
                      className="whitespace-nowrap px-2 py-3 text-right align-top tabular-nums text-slate-700"
                      title={p.projectValueText ?? undefined}
                    >
                      {formatValueWan(p)}
                    </td>
                    <td className="max-w-[7rem] whitespace-pre-line px-2 py-3 align-top text-slate-700">
                      {dash(p.scheduleEnd)}
                    </td>
                    <td className="px-2 py-3 align-top">
                      <span
                        className={`inline-flex whitespace-nowrap rounded-full border px-2 py-0.5 text-xs ${stageClass(p.stage)}`}
                      >
                        {displayLabel(projectStageLabel, p.stage)}
                      </span>
                    </td>
                    {canManage ? (
                      <td className="px-2 py-3 align-top" onClick={(e) => e.stopPropagation()}>
                        <div className="flex flex-wrap items-center gap-1.5">
                        {!p.owner && (
                          <button
                            type="button"
                            onClick={() => claimProject(p.id)}
                            disabled={claimingId === p.id}
                            className="inline-flex rounded border border-teal-600 bg-teal-50 px-2 py-0.5 text-xs font-medium text-teal-800 hover:bg-teal-100 disabled:opacity-50"
                          >
                            {claimingId === p.id ? "认领中..." : "认领"}
                          </button>
                        )}
                        <select
                          value={p.owner?.id ?? ""}
                          disabled={assigningId === p.id}
                          onChange={(e) => {
                            if (e.target.value && e.target.value !== p.owner?.id) assignProject(p.id, e.target.value);
                          }}
                          className="max-w-[8rem] rounded border border-stone-300 bg-white px-1 py-0.5 text-xs"
                        >
                          {!p.owner && <option value="">分配</option>}
                          {p.owner && !assignees.some((u) => u.id === p.owner?.id) && (
                            <option value={p.owner.id}>{p.owner.name}</option>
                          )}
                          {assignees.map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.roleLabel ? `${u.name}（${u.roleLabel}）` : u.name}
                            </option>
                          ))}
                        </select>
                        </div>
                      </td>
                    ) : (
                      <td className="max-w-[7rem] px-2 py-3 align-top text-slate-700">
                        {p.owner?.name?.trim() || "未分配"}
                      </td>
                    )}
                    <td className="px-2 py-3 align-top" onClick={(e) => e.stopPropagation()}>
                      <select
                        value={p.progressMark ?? ""}
                        disabled={markingId === p.id}
                        onChange={(e) => changeProgressMark(p, e.target.value)}
                        className="max-w-[6.5rem] rounded border border-stone-300 bg-white px-1 py-0.5 text-xs"
                      >
                        <option value="" disabled>
                          {UNMARKED_PROGRESS_LABEL}
                        </option>
                        {PROJECT_PROGRESS_MARKS.map((mark) => (
                          <option key={mark} value={mark}>
                            {mark}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td
                      className={`whitespace-nowrap px-2 py-3 align-top text-xs ${
                        followUpOverdue ? "font-medium text-red-600" : "text-slate-700"
                      }`}
                      title={followUpOverdue ? "已逾期" : undefined}
                    >
                      {followUpText ?? "—"}
                    </td>
                    <td className="w-[9.5rem] px-2 py-3 align-top" onClick={(e) => e.stopPropagation()}>
                      <div className="flex flex-wrap items-center gap-1">
                        <button
                          type="button"
                          disabled={deferringId === p.id || !(canManage || (me && p.owner?.id === me.id))}
                          onClick={() => toggleDeferred(p)}
                          className={`inline-flex rounded border px-2 py-0.5 text-xs disabled:opacity-60 ${
                            p.status === PROJECT_PARKED_STATUS
                              ? "border-stone-400 bg-white text-slate-700 hover:bg-stone-50"
                              : "border-amber-400 bg-amber-50 text-amber-900 hover:bg-amber-100"
                          }`}
                        >
                          {p.status === PROJECT_PARKED_STATUS ? "取消暂缓" : "暂缓开发"}
                        </button>
                        <button
                          type="button"
                          disabled={abandoningId === p.id}
                          onClick={() => toggleAbandoned(p)}
                          className={`inline-flex rounded border px-2 py-0.5 text-xs disabled:opacity-60 ${
                            p.status === PROJECT_ABANDONED_STATUS
                              ? "border-stone-400 bg-white text-slate-700 hover:bg-stone-50"
                              : "border-rose-400 bg-rose-50 text-rose-800 hover:bg-rose-100"
                          }`}
                        >
                          {p.status === PROJECT_ABANDONED_STATUS ? "取消废弃" : "废弃"}
                        </button>
                        <button
                          type="button"
                          onClick={() => openUpdate(p)}
                          className="inline-flex rounded border border-teal-500 bg-teal-50 px-2 py-0.5 text-xs text-teal-900 hover:bg-teal-100"
                        >
                          更新
                        </button>
                        <Link
                          href={`/export/projects/${p.id}`}
                          className="inline-flex rounded border border-stone-400 bg-white px-2 py-0.5 text-xs text-slate-700 hover:bg-stone-50"
                        >
                          详情
                        </Link>
                      </div>
                    </td>
                  </tr>
                  {updatingId === p.id ? (
                    <tr className="border-b border-stone-200/80 bg-teal-50/40">
                      <td
                        colSpan={canManage ? 10 : 9}
                        className="px-4 py-3"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex flex-wrap items-end gap-3">
                          <label className="text-sm text-slate-700">
                            <span className="mb-1 block text-xs text-slate-500">阶段</span>
                            <select
                              value={updateDraft.stage}
                              onChange={(e) => setUpdateDraft((d) => ({ ...d, stage: e.target.value }))}
                              className="rounded-md border border-stone-300 bg-white px-2 py-1.5 text-sm"
                            >
                              {PROJECT_STAGES.map((s) => (
                                <option key={s} value={s}>
                                  {projectStageLabel[s] ?? s}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className="min-w-[16rem] flex-1 text-sm text-slate-700">
                            <span className="mb-1 block text-xs text-slate-500">更新内容</span>
                            <input
                              type="text"
                              value={updateDraft.note}
                              onChange={(e) => setUpdateDraft((d) => ({ ...d, note: e.target.value }))}
                              placeholder="写一句这次进度/变化"
                              className="w-full rounded-md border border-stone-300 bg-white px-3 py-1.5 text-sm"
                            />
                          </label>
                          <button
                            type="button"
                            disabled={savingUpdateId === p.id}
                            onClick={() => saveUpdate(p)}
                            className="export-btn-primary rounded-md px-3 py-1.5 text-sm disabled:opacity-50"
                          >
                            {savingUpdateId === p.id ? "保存中..." : "保存更新"}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setUpdatingId(null);
                              setUpdateDraft({ stage: "", note: "" });
                            }}
                            className="export-btn-secondary rounded-md px-3 py-1.5 text-sm"
                          >
                            取消
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {pagination && pagination.total > 0 && (
        <Pagination
          page={page}
          totalPages={pagination.totalPages}
          total={pagination.total}
          onPageChange={(p) => updateUrl({ page: p })}
        />
      )}
    </div>
  );
}
