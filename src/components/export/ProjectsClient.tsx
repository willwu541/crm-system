"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { PROJECT_PARTY_ROLES, PROJECT_STATUSES } from "@/lib/export-constants";
import {
  displayInterestedProductsList,
  projectPartyRoleLabel,
  projectStatusLabel,
} from "@/lib/export-display-labels";
import { buildListUrl } from "@/lib/export/url-params";
import { countryLabel } from "@/lib/export/countries";
import { parseResponseJson } from "@/lib/parse-response-json";
import { Pagination } from "./shared/Pagination";
import { CountrySelect } from "./CountrySelect";

interface ProjectRow {
  id: string;
  name: string;
  country: string | null;
  city: string | null;
  productNeed: string | null;
  status: string;
  bidDeadline: string | null;
  owner: { id: string; name: string } | null;
  createdBy: { id: string; name: string };
  _count: { parties: number };
  updatedAt: string;
}

interface PaginationInfo {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

function statusClass(status: string) {
  if (status === "won") return "bg-green-50 text-green-700";
  if (status === "lost") return "bg-red-50 text-red-700";
  if (status === "hunting") return "bg-amber-50 text-amber-700";
  if (status === "parked") return "bg-slate-100 text-slate-500";
  return "bg-slate-100 text-slate-600";
}

export function ProjectsClient() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const status = searchParams.get("status") ?? "";
  const country = searchParams.get("country") ?? "";
  const ownerId = searchParams.get("ownerId") ?? "";
  const role = searchParams.get("role") ?? "";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const keywordParam = searchParams.get("keyword") ?? "";
  const sortBy = searchParams.get("sortBy") ?? "updatedAt";
  const sortOrder = searchParams.get("sortOrder") ?? "desc";

  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [countries, setCountries] = useState<string[]>([]);
  const [users, setUsers] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState(keywordParam);

  useEffect(() => {
    setKeyword(keywordParam);
  }, [keywordParam]);

  function updateUrl(updates: Record<string, string | number | undefined>) {
    const merged = {
      status: status || undefined,
      country: country || undefined,
      ownerId: ownerId || undefined,
      role: role || undefined,
      keyword: keyword || undefined,
      sortBy,
      sortOrder,
      page,
      ...updates,
    };
    router.replace(buildListUrl(pathname, merged));
  }

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/export/users");
        const json = await parseResponseJson<{ data?: { id: string; name: string }[] }>(res);
        if (res.ok && json.data) setUsers(json.data);
      } catch {
        /* ignore */
      }
    })();
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.set("page", String(page));
        if (status) params.set("status", status);
        if (country) params.set("country", country);
        if (ownerId) params.set("ownerId", ownerId);
        if (role) params.set("role", role);
        if (keywordParam) params.set("keyword", keywordParam);
        if (sortBy) params.set("sortBy", sortBy);
        if (sortOrder) params.set("sortOrder", sortOrder);
        const res = await fetch(`/api/export/projects?${params}`);
        const json = await parseResponseJson<{
          error?: string;
          data?: ProjectRow[];
          pagination?: PaginationInfo;
          countries?: string[];
        }>(res);
        if (cancelled) return;
        if (!res.ok) throw new Error(json.error ?? "加载失败");
        setProjects(json.data || []);
        setPagination(json.pagination ?? null);
        setCountries(json.countries ?? []);
      } catch (e) {
        console.error(e);
        if (!cancelled) setProjects([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [page, status, country, ownerId, role, keywordParam, sortBy, sortOrder]);

  return (
    <div className="space-y-4">
      <div className="export-filter-shell flex flex-wrap items-center gap-3 p-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            updateUrl({ keyword: keyword || undefined, page: 1 });
          }}
          className="flex flex-wrap gap-2"
        >
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="项目/公司/联系人/WhatsApp"
            className="px-3 py-2 text-sm"
          />
          <CountrySelect
            value={country}
            extraValues={countries}
            allowCustom
            onChange={(next) => updateUrl({ country: next || undefined, page: 1 })}
            className="min-w-[9.5rem] px-3 py-2 text-sm"
          />
          <select
            value={status}
            onChange={(e) => updateUrl({ status: e.target.value || undefined, page: 1 })}
            className="px-3 py-2 text-sm"
          >
            <option value="">全部状态</option>
            {PROJECT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {projectStatusLabel[s] ?? s}
              </option>
            ))}
          </select>
          <select
            value={role}
            onChange={(e) => updateUrl({ role: e.target.value || undefined, page: 1 })}
            className="px-3 py-2 text-sm"
          >
            <option value="">全部角色</option>
            {PROJECT_PARTY_ROLES.map((r) => (
              <option key={r} value={r}>
                {projectPartyRoleLabel[r] ?? r}
              </option>
            ))}
          </select>
          <select
            value={ownerId}
            onChange={(e) => updateUrl({ ownerId: e.target.value || undefined, page: 1 })}
            className="px-3 py-2 text-sm"
          >
            <option value="">全部跟进人</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
          <select
            value={`${sortBy}:${sortOrder}`}
            onChange={(e) => {
              const [nextSortBy, nextSortOrder] = e.target.value.split(":");
              updateUrl({ sortBy: nextSortBy, sortOrder: nextSortOrder, page: 1 });
            }}
            className="px-3 py-2 text-sm"
          >
            <option value="updatedAt:desc">最新更新</option>
            <option value="createdAt:desc">最新创建</option>
            <option value="bidDeadline:asc">截止最早</option>
            <option value="name:asc">项目名 A-Z</option>
          </select>
          <button type="submit" className="export-btn-secondary rounded-md px-4 py-2 text-sm">
            搜索
          </button>
        </form>
        <Link
          href="/export/projects/new"
          className="export-btn-primary rounded-md px-4 py-2 text-sm font-medium"
        >
          新建项目
        </Link>
      </div>

      <div className="export-card overflow-x-auto overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500">加载中...</div>
        ) : projects.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            还没有项目。先录入碰到的项目，再让业务员去找 EPC / 总包 / 分包联系方式。
          </div>
        ) : (
          <table className="export-table w-full text-sm">
            <thead className="border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-slate-700">项目</th>
                <th className="px-4 py-3 text-left font-medium text-slate-700">国家</th>
                <th className="px-4 py-3 text-left font-medium text-slate-700">产品</th>
                <th className="px-4 py-3 text-left font-medium text-slate-700">状态</th>
                <th className="px-4 py-3 text-left font-medium text-slate-700">已找公司</th>
                <th className="px-4 py-3 text-left font-medium text-slate-700">跟进人</th>
                <th className="px-4 py-3 text-left font-medium text-slate-700">截止</th>
                <th className="px-4 py-3 text-left font-medium text-slate-700">操作</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((p) => (
                <tr
                  key={p.id}
                  className="cursor-pointer border-b border-slate-100"
                  onClick={() => router.push(`/export/projects/${p.id}`)}
                >
                  <td className="px-4 py-3 font-medium text-slate-800">
                    {p.name}
                    {p.city ? <div className="text-xs font-normal text-slate-500">{p.city}</div> : null}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{countryLabel(p.country) || p.country || "-"}</td>
                  <td className="max-w-[16rem] truncate px-4 py-3 text-slate-600">
                    {displayInterestedProductsList(
                      p.productNeed ? p.productNeed.split(/[,，]/).map((s) => s.trim()).filter(Boolean) : [],
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded px-2 py-0.5 text-xs ${statusClass(p.status)}`}>
                      {projectStatusLabel[p.status] ?? p.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{p._count.parties}</td>
                  <td className="px-4 py-3 text-slate-600">{p.owner?.name ?? "未指定"}</td>
                  <td className="px-4 py-3 text-slate-500">
                    {p.bidDeadline ? new Date(p.bidDeadline).toLocaleDateString("zh-CN") : "-"}
                  </td>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <Link href={`/export/projects/${p.id}`} className="text-teal-600 hover:underline">
                      找人
                    </Link>
                  </td>
                </tr>
              ))}
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
