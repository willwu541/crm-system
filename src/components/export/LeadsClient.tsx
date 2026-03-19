"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { LEAD_STATUSES } from "@/lib/export-constants";
import { buildListUrl } from "@/lib/export/url-params";
import { useToast } from "@/components/ui/Toast";
import { LeadForm } from "./LeadForm";
import { Drawer } from "./shared/Drawer";
import { Pagination } from "./shared/Pagination";

interface Lead {
  id: string;
  companyName: string;
  country: string | null;
  email: string | null;
  status: string;
  owner: { id: string; name: string };
  createdAt: string;
  convertedToCustomerId: string | null;
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

const STATUS_LABELS: Record<string, string> = {
  new: "新线索",
  pending_review: "待审核",
  valid: "有效",
  invalid: "无效",
  converted: "已转化",
};

export function LeadsClient() {
  const { toast } = useToast();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const since = searchParams.get("since") ?? "";
  const status = searchParams.get("status") ?? "";
  const country = searchParams.get("country") ?? "";
  const ownerId = searchParams.get("ownerId") ?? "";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const keywordParam = searchParams.get("keyword") ?? "";
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
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  async function fetchUsers() {
    try {
      const res = await fetch("/api/export/users");
      const json = await res.json();
      if (res.ok && json.data) setUsers(json.data);
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
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "导入失败");
      setLeads([]);
      fetchLeads({ page: 1 });
    } catch (err) {
      setError(err instanceof Error ? err.message : "导入失败");
    } finally {
      setImporting(false);
      e.target.value = "";
    }
  }

  async function fetchLeads(overrides?: { page?: number }) {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("page", String(overrides?.page ?? page));
      if (status) params.set("status", status);
      if (keyword) params.set("keyword", keyword);
      if (country) params.set("country", country);
      if (ownerId) params.set("ownerId", ownerId);
      if (since) params.set("since", since);
      const res = await fetch(`/api/export/leads?${params}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "加载失败");
      setLeads(json.data || []);
      setPagination(json.pagination);
    } catch (e) {
      setError(e instanceof Error ? e.message : "加载失败");
      setLeads([]);
    } finally {
      setLoading(false);
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
      keyword: keyword || undefined,
      page,
      ...updates,
    };
    router.replace(buildListUrl(pathname, merged));
  }

  useEffect(() => {
    fetchLeads();
  }, [page, status, country, ownerId, since]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    updateUrl({ keyword: keyword || undefined, country: countryInput || undefined, page: 1 });
  }

  async function handleConvert(leadId: string) {
    setConverting(leadId);
    setError(null);
    try {
      const res = await fetch(`/api/export/leads/${leadId}/convert`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "转化失败");
      const cid = json.data?.id ?? json.customerId;
      if (cid) {
        toast("转化成功");
        window.location.href = `/export/customers/${cid}`;
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
                {STATUS_LABELS[s] ?? s}
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
          <button type="submit" className="rounded-md bg-slate-700 px-4 py-2 text-sm text-white hover:bg-slate-800">
            搜索
          </button>
        </form>
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

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
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
                <th className="px-4 py-3 text-left font-medium text-slate-700">公司</th>
                <th className="px-4 py-3 text-left font-medium text-slate-700">国家</th>
                <th className="px-4 py-3 text-left font-medium text-slate-700">邮箱</th>
                <th className="px-4 py-3 text-left font-medium text-slate-700">状态</th>
                <th className="px-4 py-3 text-left font-medium text-slate-700">负责人</th>
                <th className="px-4 py-3 text-left font-medium text-slate-700">创建时间</th>
                <th className="px-4 py-3 text-left font-medium text-slate-700">操作</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((l) => (
                <tr
                  key={l.id}
                  className="cursor-pointer border-b border-slate-100 hover:bg-slate-50"
                  onClick={() => (window.location.href = `/export/leads/${l.id}`)}
                >
                  <td className="px-4 py-3 font-medium text-slate-800">{l.companyName}</td>
                  <td className="px-4 py-3 text-slate-600">{l.country ?? "-"}</td>
                  <td className="px-4 py-3 text-slate-600">{l.email ?? "-"}</td>
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
                      {STATUS_LABELS[l.status] ?? l.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{l.owner.name}</td>
                  <td className="px-4 py-3 text-slate-500">
                    {new Date(l.createdAt).toLocaleDateString("zh-CN")}
                  </td>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <span className="flex gap-3">
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
              ))}
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
            fetchLeads({ page: 1 });
          }}
          onCancel={() => setDrawerOpen(false)}
        />
      </Drawer>
    </div>
  );
}
