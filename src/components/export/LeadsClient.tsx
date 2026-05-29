"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { LEAD_STATUSES } from "@/lib/export-constants";
import { leadStatusLabel } from "@/lib/export-display-labels";
import { buildListUrl } from "@/lib/export/url-params";
import { useToast } from "@/components/ui/Toast";
import { LeadForm } from "./LeadForm";
import { Drawer } from "./shared/Drawer";
import { Pagination } from "./shared/Pagination";
import { QuickContactModal } from "./QuickContactModal";
import { parseResponseJson } from "@/lib/parse-response-json";
import { getWebsiteHost, normalizeWebsiteUrl } from "@/lib/website";
import { getLeadPaceBadge } from "@/lib/export/lead-pace";
import { SocialLinksBar } from "./SocialLinksBar";

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
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const keywordParam = searchParams.get("keyword") ?? "";
  const sortBy = searchParams.get("sortBy") ?? "lastContactAt";
  const sortOrder = searchParams.get("sortOrder") ?? "desc";
  const [leads, setLeads] = useState<Lead[]>([]);
  const [pagination, setPagination] = useState<PaginationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [keyword, setKeyword] = useState(keywordParam);
  const [countryInput, setCountryInput] = useState(country);
  const [converting, setConverting] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
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
      if (status) params.set("status", status);
      if (keywordParam) params.set("keyword", keywordParam);
      if (country) params.set("country", country);
      if (ownerId) params.set("ownerId", ownerId);
      if (since) params.set("since", since);
      if (pace) params.set("pace", pace);
      if (sortBy) params.set("sortBy", sortBy);
      if (sortOrder) params.set("sortOrder", sortOrder);
      const res = await fetch(`/api/export/leads?${params}`);
      const json = await parseResponseJson(res);
      if (!res.ok) throw new Error(String(json.error ?? "加载失败"));
      setLeads((json.data as Lead[]) || []);
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
    fetchLeads();
  }, [page, status, country, ownerId, since, pace, keywordParam, sortBy, sortOrder]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    updateUrl({ keyword: keyword || undefined, country: countryInput || undefined, page: 1 });
  }

  async function handleConvert(leadId: string) {
    setConverting(leadId);
    setError(null);
    try {
      const res = await fetch(`/api/export/leads/${leadId}/convert`, { method: "POST" });
      const json = await parseResponseJson(res);
      if (!res.ok) throw new Error(String(json.error ?? "转化失败"));
      const cid = (json.data as { id?: string } | undefined)?.id ?? json.customerId;
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
      <div className="flex flex-wrap items-center gap-3">
        <form onSubmit={handleSearch} className="flex flex-wrap gap-2">
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="公司名/邮箱/电话"
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            type="text"
            value={countryInput}
            onChange={(e) => setCountryInput(e.target.value)}
            placeholder="国家"
            className="w-24 rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <select
            value={status}
            onChange={(e) => updateUrl({ status: e.target.value || undefined, page: 1 })}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
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
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">全部时间</option>
            <option value="week">本周新增</option>
          </select>
          <select
            value={ownerId}
            onChange={(e) => updateUrl({ ownerId: e.target.value || undefined, page: 1 })}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">全部负责人</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
          <select
            value={`${sortBy}:${sortOrder}`}
            onChange={(e) => updateSort(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="createdAt:desc">最新创建</option>
            <option value="updatedAt:desc">最新更新</option>
            <option value="lastContactAt:desc">最近联系</option>
            <option value="lastContactAt:asc">最久未联系优先</option>
            <option value="companyName:asc">公司 A-Z</option>
          </select>
          <button type="submit" className="rounded-md bg-slate-700 px-4 py-2 text-sm text-white hover:bg-slate-800">
            搜索
          </button>
        </form>

        <div className="flex flex-wrap gap-1">
          {[
            { key: "", label: "全部" },
            { key: "never", label: "未联系过" },
            { key: "due", label: "该跟进了" },
            { key: "stuck", label: "联系 3+ 无响应" },
          ].map((p) => (
            <button
              key={p.key || "all"}
              type="button"
              onClick={() =>
                updateUrl({
                  pace: p.key || undefined,
                  page: 1,
                  ...(p.key === "due" || p.key === "stuck"
                    ? { sortBy: "lastContactAt", sortOrder: "asc" }
                    : {}),
                })
              }
              className={`rounded-full border px-3 py-1 text-xs ${
                pace === p.key
                  ? "border-teal-500 bg-teal-50 text-teal-700"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => setDrawerOpen(true)}
          className="rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
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
          className="rounded-md border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50 disabled:opacity-50"
        >
          {importing ? "导入中..." : "导入 CSV"}
        </button>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">{error}</div>
      )}

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        {loading ? (
          <div className="p-12 text-center text-slate-500">加载中...</div>
        ) : leads.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            暂无线索
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
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50">
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
                return (
                  <tr
                    key={l.id}
                    className="cursor-pointer border-b border-slate-100 hover:bg-slate-50"
                    onClick={() => router.push(`/export/leads/${l.id}`)}
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
                          l.sourceChannel ?? "未填官网"
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
                      <span className={`inline-flex rounded px-2 py-0.5 text-xs ${badge.className}`}>
                        {badge.label}
                      </span>
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
                                contactWhatsapp: l.whatsapp ?? l.phone,
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
                                contactWhatsapp: l.whatsapp ?? l.phone,
                              })
                            }
                            className="text-slate-500 hover:underline"
                          >
                            收到回复
                          </button>
                        )}
                        <Link href={`/export/leads/${l.id}`} className="text-teal-600 hover:underline">
                          详情
                        </Link>
                        {l.status !== "converted" && (
                          <button
                            onClick={() => handleConvert(l.id)}
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

      {pagination && pagination.totalPages > 1 && (
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
    </div>
  );
}
