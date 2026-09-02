"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { LEAD_STATUSES } from "@/lib/export-constants";
import { leadStatusLabel, sourceChannelLabel } from "@/lib/export-display-labels";
import { buildListUrl } from "@/lib/export/url-params";
import { saveListQuery } from "@/lib/export/list-filter-storage";
import { usePersistedListQuery } from "@/lib/export/use-persisted-list-query";
import { useToast } from "@/components/ui/Toast";
import { LeadForm } from "./LeadForm";
import { Drawer } from "./shared/Drawer";
import { Pagination } from "./shared/Pagination";
import { QuickContactModal } from "./QuickContactModal";
import { parseResponseJson } from "@/lib/parse-response-json";
import { getWebsiteHost, normalizeWebsiteUrl } from "@/lib/website";
import { getLeadPaceBadge } from "@/lib/export/lead-pace";
import { resolveWhatsappStage } from "@/lib/export/follow-up";
import { SocialLinksBar } from "./SocialLinksBar";
import { ConvertLeadModal, type ConvertLeadPayload } from "./ConvertLeadModal";
import { ElsewhereHits, type ElsewhereHit } from "./ElsewhereHits";

interface Lead {
  id: string;
  companyName: string;
  website: string | null;
  country: string | null;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  linkedin: string | null;
  facebook: string | null;
  tiktok: string | null;
  sourceChannel: string | null;
  notes: string | null;
  status: string;
  owner: { id: string; name: string };
  createdAt: string;
  updatedAt: string;
  lastContactAt: string | null;
  nextFollowUpAt: string | null;
  contactCount: number;
  convertedToCustomerId: string | null;
}

interface QuickModalState {
  open: boolean;
  leadId: string;
  contactCount: number;
  defaultDirection: "outbound" | "inbound";
  contactEmail?: string | null;
  contactWhatsapp?: string | null;
}

interface User {
  id: string;
  name: string;
  email: string;
}

interface PaginationData {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export function LeadsClient() {
  const { toast } = useToast();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const since = searchParams.get("since") ?? "";
  const status = searchParams.get("status") ?? "";
  const country = searchParams.get("country") ?? "";
  const ownerId = searchParams.get("ownerId") ?? "";
  const pace = searchParams.get("pace") ?? "";
  const sourceChannel = searchParams.get("sourceChannel") ?? "";
  const channel = searchParams.get("channel") ?? "";
  const filter = searchParams.get("filter") ?? "";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const keywordParam = searchParams.get("keyword") ?? "";
  const sortBy = searchParams.get("sortBy") ?? "lastContactAt";
  const sortOrder = searchParams.get("sortOrder") ?? "desc";
  const { hydrated, resetListQuery } = usePersistedListQuery("/export/leads");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [pagination, setPagination] = useState<PaginationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [keyword, setKeyword] = useState(keywordParam);
  const [countryInput, setCountryInput] = useState(country);
  const [converting, setConverting] = useState<string | null>(null);
  const [convertLead, setConvertLead] = useState<Lead | null>(null);
  const [importing, setImporting] = useState(false);
  const [emailCopyFormat, setEmailCopyFormat] = useState<"newline" | "comma">("newline");
  const [copyingEmails, setCopyingEmails] = useState(false);
  const [copyingWhatsapps, setCopyingWhatsapps] = useState(false);
  const [elsewhere, setElsewhere] = useState<ElsewhereHit[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [quickModal, setQuickModal] = useState<QuickModalState>({
    open: false,
    leadId: "",
    contactCount: 0,
    defaultDirection: "outbound",
  });
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  async function fetchUsers() {
    try {
      const res = await fetch("/api/export/users");
      const json = await parseResponseJson(res);
      if (res.ok && json.data) setUsers(json.data as User[]);
    } catch {
      // ignore
    }
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/export/leads/import", {
        method: "POST",
        body: formData,
      });
      const json = await parseResponseJson<{
        error?: string;
        data?: { created: number; skipped: number; emptyRows: number; total: number };
      }>(res);
      if (!res.ok) throw new Error(String(json.error ?? "导入失败"));
      const d = json.data;
      toast(
        d
          ? `导入完成：新增 ${d.created} 条，跳过重复 ${d.skipped} 条${d.emptyRows ? `，空行 ${d.emptyRows}` : ""}（共 ${d.total} 行）`
          : "导入完成",
      );
      setLeads([]);
      fetchLeads({ page: 1 });
    } catch (err) {
      setError(err instanceof Error ? err.message : "导入失败");
    } finally {
      setImporting(false);
      e.target.value = "";
    }
  }

  async function fetchLeads(overrides?: { page?: number; silent?: boolean }) {
    if (!overrides?.silent) setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("page", String(overrides?.page ?? page));
      if (keywordParam) {
        params.set("keyword", keywordParam);
        if (country) params.set("country", country);
      } else {
        if (status) params.set("status", status);
        if (country) params.set("country", country);
        if (ownerId) params.set("ownerId", ownerId);
        if (since) params.set("since", since);
        if (pace) params.set("pace", pace);
        if (sourceChannel) params.set("sourceChannel", sourceChannel);
        if (channel) params.set("channel", channel);
        if (filter) params.set("filter", filter);
      }
      if (sortBy) params.set("sortBy", sortBy);
      if (sortOrder) params.set("sortOrder", sortOrder);
      const res = await fetch(`/api/export/leads?${params}`);
      const json = await parseResponseJson(res);
      if (!res.ok) throw new Error(String(json.error ?? "加载失败"));
      setLeads((json.data as Lead[]) || []);
      setElsewhere((json.elsewhere as ElsewhereHit[]) || []);
      setPagination(json.pagination as PaginationData);
    } catch (e) {
      setError(e instanceof Error ? e.message : "加载失败");
      setLeads([]);
    } finally {
      if (!overrides?.silent) setLoading(false);
    }
  }

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    setKeyword(keywordParam);
    setCountryInput(country);
  }, [keywordParam, country]);

  function updateUrl(updates: Record<string, string | number | undefined>) {
    const merged = {
      since: since || undefined,
      status: status || undefined,
      country: country || undefined,
      ownerId: ownerId || undefined,
      pace: pace || undefined,
      sourceChannel: sourceChannel || undefined,
      channel: channel || undefined,
      filter: filter || undefined,
      keyword: keyword || undefined,
      sortBy,
      sortOrder,
      page,
      ...updates,
    };
    router.replace(buildListUrl(pathname, merged));
  }

  function updateSort(value: string) {
    const [nextSortBy, nextSortOrder] = value.split(":");
    updateUrl({ sortBy: nextSortBy, sortOrder: nextSortOrder, page: 1 });
  }

  useEffect(() => {
    if (!hydrated) return;
    fetchLeads();
  }, [hydrated, page, status, country, ownerId, since, pace, sourceChannel, channel, filter, keywordParam, sortBy, sortOrder]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    updateUrl({
      keyword: keyword || undefined,
      country: countryInput || undefined,
      page: 1,
      filter: undefined,
      status: undefined,
      channel: undefined,
      pace: undefined,
      since: undefined,
      sourceChannel: undefined,
      ownerId: undefined,
    });
  }

  function buildListFilterParams(mode?: "emails" | "whatsapps") {
    const params = new URLSearchParams();
    if (mode === "emails") params.set("emails", "1");
    if (mode === "whatsapps") params.set("whatsapps", "1");
    if (status) params.set("status", status);
    if (keywordParam) params.set("keyword", keywordParam);
    if (country) params.set("country", country);
    if (ownerId) params.set("ownerId", ownerId);
    if (since) params.set("since", since);
    if (pace) params.set("pace", pace);
    if (sourceChannel) params.set("sourceChannel", sourceChannel);
    if (channel) params.set("channel", channel);
    if (filter) params.set("filter", filter);
    return params;
  }

  function openLead(id: string) {
    saveListQuery(pathname, searchParams.toString());
    router.push(`/export/leads/${id}`);
  }

  async function copyChannelValues(mode: "emails" | "whatsapps") {
    const copying = mode === "emails" ? setCopyingEmails : setCopyingWhatsapps;
    copying(true);
    try {
      const res = await fetch(`/api/export/leads?${buildListFilterParams(mode)}`);
      const json = await parseResponseJson<{
        error?: string;
        data?: string[];
        total?: number;
        leadCount?: number;
      }>(res);
      if (!res.ok) throw new Error(String(json.error ?? (mode === "emails" ? "获取邮箱失败" : "获取 WhatsApp 失败")));
      const values = json.data ?? [];
      if (values.length === 0) {
        toast(mode === "emails" ? "当前筛选结果中没有可复制的邮箱" : "当前筛选结果中没有可复制的 WhatsApp", "error");
        return;
      }
      const text = emailCopyFormat === "comma" ? values.join(", ") : values.join("\n");
      await navigator.clipboard.writeText(text);
      toast(
        mode === "emails"
          ? `已复制 ${values.length} 个邮箱（${json.leadCount ?? values.length} 条线索）`
          : `已复制 ${values.length} 个 WhatsApp（${json.leadCount ?? values.length} 条线索）`,
      );
    } catch (e) {
      toast(e instanceof Error ? e.message : "复制失败", "error");
    } finally {
      copying(false);
    }
  }

  async function handleConvert(leadId: string, payload?: ConvertLeadPayload) {
    setConverting(leadId);
    setError(null);
    try {
      const res = await fetch(`/api/export/leads/${leadId}/convert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerStatus: payload?.customerStatus,
          nextFollowUpAt: payload?.nextFollowUpAt
            ? new Date(payload.nextFollowUpAt).toISOString()
            : undefined,
          createTaskTitle: payload?.createTaskTitle,
          createTaskDueAt: payload?.createTaskDueAt
            ? new Date(payload.createTaskDueAt).toISOString()
            : undefined,
        }),
      });
      const json = await parseResponseJson(res);
      if (!res.ok) throw new Error(String(json.error ?? "转化失败"));
      const cid = (json.data as { id?: string } | undefined)?.id ?? json.customerId;
      setConvertLead(null);
      if (cid) {
        toast("转化成功");
        router.push(`/export/customers/${cid}`);
      } else {
        toast("转化成功");
        fetchLeads();
      }
    } catch (e) {
      toast(e instanceof Error ? e.message : "转化失败", "error");
      setError(e instanceof Error ? e.message : "转化失败");
    } finally {
      setConverting(null);
    }
  }

  function renderTime(lead: Lead) {
    if (sortBy === "lastContactAt") {
      return lead.lastContactAt ? new Date(lead.lastContactAt).toLocaleDateString("zh-CN") : "-";
    }
    if (sortBy === "updatedAt") {
      return new Date(lead.updatedAt).toLocaleDateString("zh-CN");
    }
    return new Date(lead.createdAt).toLocaleDateString("zh-CN");
  }

  return (
    <div className="space-y-4">
      <div className="export-filter-shell">
        <div className="mb-3">
          <h1 className="text-lg font-semibold text-slate-800">线索开发中心</h1>
          <p className="text-xs text-slate-500">管理获客渠道、联系节奏、转化进度</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
        <form onSubmit={handleSearch} className="flex flex-wrap gap-2">
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="搜索公司名、邮箱、电话"
            className="px-3 py-2 text-sm"
          />
          <input
            type="text"
            value={countryInput}
            onChange={(e) => setCountryInput(e.target.value)}
            placeholder="国家"
            className="w-24 px-3 py-2 text-sm"
          />
          <select
            value={status}
            onChange={(e) => updateUrl({ status: e.target.value || undefined, page: 1 })}
            className="px-3 py-2 text-sm"
          >
            <option value="">全部状态</option>
            {LEAD_STATUSES.map((s) => (
              <option key={s} value={s}>
                {leadStatusLabel[s] ?? s}
              </option>
            ))}
          </select>
          <select
            value={since}
            onChange={(e) => updateUrl({ since: e.target.value || undefined, page: 1 })}
            className="px-3 py-2 text-sm"
          >
            <option value="">全部时间</option>
            <option value="week">本周新增</option>
          </select>
          <select
            value={ownerId}
            onChange={(e) => updateUrl({ ownerId: e.target.value || undefined, page: 1 })}
            className="px-3 py-2 text-sm"
          >
            <option value="">全部业务员</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
          <select
            value={channel}
            onChange={(e) => updateUrl({ channel: e.target.value || undefined, page: 1 })}
            className="px-3 py-2 text-sm"
          >
            <option value="">全部联系方式</option>
            <option value="email">有邮箱</option>
            <option value="no_email">无邮箱</option>
            <option value="whatsapp">有 WhatsApp</option>
            <option value="no_whatsapp">无 WhatsApp</option>
          </select>
          <select
            value={`${sortBy}:${sortOrder}`}
            onChange={(e) => updateSort(e.target.value)}
            className="px-3 py-2 text-sm"
          >
            <option value="createdAt:desc">最新创建</option>
            <option value="updatedAt:desc">最新更新</option>
            <option value="lastContactAt:desc">最近联系</option>
            <option value="lastContactAt:asc">最久未联系优先</option>
            <option value="companyName:asc">公司 A-Z</option>
          </select>
          <button type="submit" className="export-btn-secondary rounded-md px-4 py-2 text-sm">
            搜索
          </button>
          <button
            type="button"
            onClick={resetListQuery}
            className="export-btn-secondary rounded-md px-3 py-2 text-sm"
          >
            重置筛选
          </button>
        </form>

        <div className="flex flex-wrap gap-1">
          {[
            { key: "", label: "全部" },
            { key: "never", label: "未联系过" },
            { key: "due", label: "该跟进了" },
            { key: "stuck", label: "联系 3+ 无响应" },
            { key: "whatsapp_first", label: "WhatsApp待联系" },
            { key: "whatsapp_maintain", label: "WhatsApp待维护" },
          ].map((p) => (
            <button
              key={p.key || "all"}
              type="button"
              onClick={() =>
                updateUrl({
                  pace:
                    p.key === "whatsapp_maintain" || p.key === "whatsapp_first"
                      ? undefined
                      : p.key || undefined,
                  filter:
                    p.key === "whatsapp_maintain" || p.key === "whatsapp_first" ? p.key : undefined,
                  page: 1,
                  ...(p.key === "due" || p.key === "stuck" || p.key === "whatsapp_maintain"
                    ? { sortBy: "lastContactAt", sortOrder: "asc" }
                    : {}),
                })
              }
              className={`export-chip px-3 py-1 ${
                p.key === "whatsapp_maintain" || p.key === "whatsapp_first"
                  ? filter === p.key
                    ? "export-chip-active"
                    : "hover:bg-slate-50"
                  : !filter && pace === p.key
                    ? "export-chip-active"
                    : "hover:bg-slate-50"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => setDrawerOpen(true)}
          className="export-btn-primary rounded-md px-4 py-2 text-sm font-medium"
        >
          新建线索
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={handleImport}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={importing}
          className="export-btn-secondary rounded-md px-4 py-2 text-sm disabled:opacity-50"
        >
          {importing ? "导入中..." : "导入 CSV"}
        </button>
        <a
          href={`/api/export/leads/export?${buildListFilterParams().toString()}`}
          download
          className="export-btn-secondary rounded-md px-4 py-2 text-sm"
        >
          导出 CSV
        </a>
        <div className="flex items-center gap-1 rounded-md border border-slate-300 bg-white p-0.5 shadow-sm">
          <select
            value={emailCopyFormat}
            onChange={(e) => setEmailCopyFormat(e.target.value as "newline" | "comma")}
            className="rounded border-0 bg-transparent px-2 py-1.5 text-sm text-slate-700 focus:outline-none"
            aria-label="复制格式"
          >
            <option value="newline">换行分隔</option>
            <option value="comma">逗号分隔</option>
          </select>
          <button
            type="button"
            onClick={() => copyChannelValues("emails")}
            disabled={copyingEmails || loading}
            className="rounded-md bg-slate-700 px-3 py-1.5 text-sm text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {copyingEmails ? "复制中..." : "复制全部邮箱"}
          </button>
          <button
            type="button"
            onClick={() => copyChannelValues("whatsapps")}
            disabled={copyingWhatsapps || loading}
            className="rounded-md bg-green-700 px-3 py-1.5 text-sm text-white hover:bg-green-800 disabled:opacity-50"
          >
            {copyingWhatsapps ? "复制中..." : "复制全部 WhatsApp"}
          </button>
        </div>
      </div>
      </div>

      {sourceChannel && (
        <div className="flex items-center gap-2 rounded-lg bg-teal-50 px-3 py-2 text-sm text-teal-800">
          <span>
            来源渠道：
            {sourceChannel === "__empty__" ? "未标注来源" : sourceChannel}
          </span>
          <button
            type="button"
            onClick={() => updateUrl({ sourceChannel: undefined, page: 1 })}
            className="text-teal-700 hover:underline"
          >
            清除
          </button>
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">{error}</div>
      )}

      <ElsewhereHits keyword={keywordParam} hits={elsewhere} current="lead" />

      <div className="export-card overflow-hidden overflow-x-auto">
        {loading ? (
          <div className="p-12 text-center text-slate-500">加载中...</div>
        ) : leads.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            {keywordParam ? `线索列表没有「${keywordParam}」` : "暂无线索"}
            <div className="mt-2">
              <button
                onClick={() => setDrawerOpen(true)}
                className="text-sm text-teal-600 hover:underline"
              >
                新建线索
              </button>
            </div>
          </div>
        ) : (
          <table className="export-table w-full text-sm">
            <thead className="border-b border-slate-200">
              <tr>
                <th className="min-w-[200px] px-4 py-3 text-left font-medium text-slate-700">公司</th>
                <th className="min-w-[280px] max-w-md px-4 py-3 text-left font-medium text-slate-700">备注</th>
                <th className="px-4 py-3 text-left font-medium text-slate-700">国家</th>
                <th className="px-4 py-3 text-left font-medium text-slate-700">联系方式</th>
                <th className="px-4 py-3 text-left font-medium text-slate-700">状态</th>
                <th className="px-4 py-3 text-left font-medium text-slate-700">跟进节奏</th>
                <th className="px-4 py-3 text-right font-medium text-slate-700">次数</th>
                <th className="px-4 py-3 text-left font-medium text-slate-700">负责人</th>
                <th className="px-4 py-3 text-left font-medium text-slate-700">时间</th>
                <th className="px-4 py-3 text-left font-medium text-slate-700">操作</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((l) => {
                const badge = getLeadPaceBadge(l);
                const waStage = resolveWhatsappStage({
                  hasWhatsapp: !!l.whatsapp?.trim(),
                  status: l.status,
                  lastContactAt: l.lastContactAt,
                  nextFollowUpAt: l.nextFollowUpAt,
                  closedStatuses: ["converted", "invalid"],
                });
                return (
                  <tr
                    key={l.id}
                    className="cursor-pointer border-b border-slate-100"
                    onClick={() => openLead(l.id)}
                  >
                    <td className="px-4 py-3 font-medium text-slate-800">
                      <div>{l.companyName}</div>
                      <div className="text-xs font-normal text-slate-500">
                        {normalizeWebsiteUrl(l.website) ? (
                          <a
                            href={normalizeWebsiteUrl(l.website)!}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-teal-600 hover:underline"
                          >
                            {getWebsiteHost(l.website)}
                          </a>
                        ) : (
                          sourceChannelLabel[l.sourceChannel ?? ""] ?? l.sourceChannel ?? "未填官网"
                        )}
                      </div>
                    </td>
                    <td className="max-w-md px-4 py-3 align-top text-slate-600">
                      {l.notes ? (
                        <p className="whitespace-pre-wrap text-xs leading-relaxed" title={l.notes}>
                          {l.notes}
                        </p>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{l.country ?? "-"}</td>
                    <td className="px-4 py-3 text-slate-600" onClick={(e) => e.stopPropagation()}>
                      <div className="text-xs">{l.email ?? "未填邮箱"}</div>
                      <SocialLinksBar
                        compact
                        email={l.email}
                        phone={l.phone}
                        whatsapp={l.whatsapp}
                        linkedin={l.linkedin}
                        facebook={l.facebook}
                        tiktok={l.tiktok}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded px-2 py-0.5 text-xs ${
                          l.status === "converted"
                            ? "bg-green-50 text-green-700"
                            : l.status === "valid"
                              ? "bg-teal-50 text-teal-700"
                              : l.status === "invalid"
                                ? "bg-slate-100 text-slate-500"
                                : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {leadStatusLabel[l.status] ?? l.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded px-2 py-0.5 text-xs ${badge.className}`}
                      >
                        {badge.label}
                      </span>
                      {waStage === "first_contact" && (
                        <span className="ml-1 rounded bg-sky-100 px-2 py-0.5 text-xs text-sky-800">
                          WA待联系
                        </span>
                      )}
                      {waStage === "maintain_due" && (
                        <span className="ml-1 rounded bg-green-100 px-2 py-0.5 text-xs text-green-800">
                          WA待维护
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-700">{l.contactCount}</td>
                    <td className="px-4 py-3 text-slate-600">{l.owner.name}</td>
                    <td className="px-4 py-3 text-slate-500">{renderTime(l)}</td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <span className="flex gap-3">
                        {l.status !== "converted" && (
                          <button
                            type="button"
                            onClick={() =>
                              setQuickModal({
                                open: true,
                                leadId: l.id,
                                contactCount: l.contactCount,
                                defaultDirection: "outbound",
                                contactEmail: l.email,
                                contactWhatsapp: l.whatsapp,
                              })
                            }
                            className="text-teal-600 hover:underline"
                            title="按节奏自动推荐模板"
                          >
                            标记联系
                          </button>
                        )}
                        {l.status !== "converted" && (
                          <button
                            type="button"
                            onClick={() =>
                              setQuickModal({
                                open: true,
                                leadId: l.id,
                                contactCount: l.contactCount,
                                defaultDirection: "inbound",
                                contactEmail: l.email,
                                contactWhatsapp: l.whatsapp,
                              })
                            }
                            className="text-slate-500 hover:underline"
                          >
                            收到回复
                          </button>
                        )}
                        <Link
                          href={`/export/leads/${l.id}`}
                          onClick={() => saveListQuery(pathname, searchParams.toString())}
                          className="text-teal-600 hover:underline"
                        >
                          详情
                        </Link>
                        {l.status !== "converted" && (
                          <button
                            onClick={() => setConvertLead(l)}
                            disabled={!!converting}
                            className="text-teal-600 hover:underline disabled:opacity-50"
                          >
                            {converting === l.id ? "转化中..." : "转客户"}
                          </button>
                        )}
                        {l.convertedToCustomerId && (
                          <Link
                            href={`/export/customers/${l.convertedToCustomerId}`}
                            className="text-teal-600 hover:underline"
                          >
                            客户
                          </Link>
                        )}
                      </span>
                    </td>
                  </tr>
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

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="新建线索" width="xl">
        <LeadForm
          onSuccess={() => {
            setDrawerOpen(false);
            toast("保存成功");
            updateUrl({ page: 1 });
            fetchLeads({ page: 1 });
          }}
          onCancel={() => setDrawerOpen(false)}
        />
      </Drawer>

      <QuickContactModal
        open={quickModal.open}
        onClose={() => setQuickModal((s) => ({ ...s, open: false }))}
        leadId={quickModal.leadId}
        contactCount={quickModal.contactCount}
        defaultDirection={quickModal.defaultDirection}
        contactEmail={quickModal.contactEmail}
        contactWhatsapp={quickModal.contactWhatsapp}
        title={quickModal.defaultDirection === "outbound" ? "记录一次主动联系" : "记录客户回复"}
        onSuccess={() => {
          toast("已记录");
          fetchLeads({ silent: true });
        }}
      />

      <ConvertLeadModal
        open={!!convertLead}
        companyName={convertLead?.companyName ?? ""}
        loading={!!convertLead && converting === convertLead.id}
        onClose={() => setConvertLead(null)}
        onSubmit={async (payload) => {
          if (convertLead) await handleConvert(convertLead.id, payload);
        }}
      />
    </div>
  );
}
