"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CUSTOMER_STATUSES } from "@/lib/export-constants";
import { customerStatusLabel } from "@/lib/export-display-labels";
import { useToast } from "@/components/ui/Toast";
import { buildListUrl } from "@/lib/export/url-params";
import { CustomerForm } from "./CustomerForm";
import { NextFollowUpModal } from "./NextFollowUpModal";
import { Drawer } from "./shared/Drawer";
import { Pagination } from "./shared/Pagination";
import { parseResponseJson } from "@/lib/parse-response-json";
import { getWebsiteHost, normalizeWebsiteUrl } from "@/lib/website";

interface Customer {
  id: string;
  customerCode: string;
  companyName: string;
  website: string | null;
  country: string | null;
  status: string;
  owner: { id: string; name: string };
  lastFollowUpAt: string | null;
  nextFollowUpAt: string | null;
  createdAt: string;
  updatedAt: string;
}

function isCustomerOverdue(c: Customer): boolean {
  if (["won", "lost"].includes(c.status)) return false;
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const ref = c.lastFollowUpAt ? new Date(c.lastFollowUpAt) : new Date(c.createdAt);
  return ref < sevenDaysAgo;
}

function isNextFollowUpDue(nextFollowUpAt: string | null): boolean {
  if (!nextFollowUpAt) return false;
  const d = new Date(nextFollowUpAt);
  const today = new Date();
  return d.toDateString() <= today.toDateString();
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

export function CustomersClient() {
  const { toast } = useToast();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const filter = searchParams.get("filter") ?? "";
  const status = searchParams.get("status") ?? "";
  const country = searchParams.get("country") ?? "";
  const ownerId = searchParams.get("ownerId") ?? "";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const keywordParam = searchParams.get("keyword") ?? "";
  const countryParam = searchParams.get("country") ?? "";
  const sortBy = searchParams.get("sortBy") ?? "updatedAt";
  const sortOrder = searchParams.get("sortOrder") ?? "desc";
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [pagination, setPagination] = useState<PaginationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [keyword, setKeyword] = useState(keywordParam);
  const [countryInput, setCountryInput] = useState(countryParam);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [followUpCustomer, setFollowUpCustomer] = useState<Customer | null>(null);
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    setKeyword(keywordParam);
    setCountryInput(countryParam);
  }, [keywordParam, countryParam]);

  function updateUrl(updates: Record<string, string | number | undefined>) {
    const merged = {
      filter: filter || undefined,
      status: status || undefined,
      country: countryParam || undefined,
      ownerId: ownerId || undefined,
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

  async function fetchUsers() {
    try {
      const res = await fetch("/api/export/users");
      const json = await parseResponseJson<{ data?: User[] }>(res);
      if (res.ok && json.data) setUsers(json.data);
    } catch {
      // ignore
    }
  }

  async function fetchCustomers(overrides?: { page?: number; silent?: boolean }) {
    if (!overrides?.silent) {
      setLoading(true);
      setError(null);
    }
    try {
      const params = new URLSearchParams();
      params.set("page", String(overrides?.page ?? page));
      if (status) params.set("status", status);
      if (filter) params.set("filter", filter);
      if (keywordParam) params.set("keyword", keywordParam);
      if (countryParam) params.set("country", countryParam);
      if (ownerId) params.set("ownerId", ownerId);
      if (sortBy) params.set("sortBy", sortBy);
      if (sortOrder) params.set("sortOrder", sortOrder);
      const res = await fetch(`/api/export/customers?${params}`);
      const json = await parseResponseJson<{
        error?: string;
        data?: Customer[];
        pagination?: PaginationData;
      }>(res);
      if (!res.ok) throw new Error(json.error ?? "加载失败");
      setCustomers(json.data || []);
      setPagination(json.pagination ?? null);
    } catch (e) {
      if (!overrides?.silent) {
        setError(e instanceof Error ? e.message : "加载失败");
        setCustomers([]);
      }
    } finally {
      if (!overrides?.silent) setLoading(false);
    }
  }

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    fetchCustomers();
  }, [page, status, filter, countryParam, ownerId, keywordParam, sortBy, sortOrder]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    updateUrl({ keyword: keyword || undefined, country: countryInput || undefined, page: 1 });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <form onSubmit={handleSearch} className="flex flex-wrap gap-2">
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="公司名/客户编号"
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
            value={filter}
            onChange={(e) => updateUrl({ filter: e.target.value || undefined, page: 1 })}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">全部</option>
            <option value="today">今日待跟进</option>
            <option value="overdue">超7天未跟进</option>
          </select>
          <select
            value={status}
            onChange={(e) => updateUrl({ status: e.target.value || undefined, page: 1 })}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">全部状态</option>
            {CUSTOMER_STATUSES.map((s) => (
              <option key={s} value={s}>
                {customerStatusLabel[s] ?? s}
              </option>
            ))}
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
            <option value="updatedAt:desc">最新更新</option>
            <option value="createdAt:desc">最新创建</option>
            <option value="lastFollowUpAt:desc">最近跟进</option>
            <option value="nextFollowUpAt:asc">最近待跟进</option>
            <option value="companyName:asc">公司 A-Z</option>
          </select>
          <button type="submit" className="rounded-md bg-slate-700 px-4 py-2 text-sm text-white hover:bg-slate-800">
            搜索
          </button>
        </form>
        <button
          onClick={() => setDrawerOpen(true)}
          className="rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
        >
          新建客户
        </button>
        <a
          href="/api/export/customers/export"
          download
          className="rounded-md border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50"
        >
          导出 CSV
        </a>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">{error}</div>
      )}

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        {loading ? (
          <div className="p-12 text-center text-slate-500">加载中...</div>
        ) : customers.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            暂无客户
            <div className="mt-2">
              <button
                onClick={() => setDrawerOpen(true)}
                className="text-sm text-teal-600 hover:underline"
              >
                新建客户
              </button>
            </div>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-slate-700">客户编号</th>
                <th className="px-4 py-3 text-left font-medium text-slate-700">公司</th>
                <th className="px-4 py-3 text-left font-medium text-slate-700">国家</th>
                <th className="px-4 py-3 text-left font-medium text-slate-700">状态</th>
                <th className="px-4 py-3 text-left font-medium text-slate-700">负责人</th>
                <th className="px-4 py-3 text-left font-medium text-slate-700">上次跟进</th>
                <th className="px-4 py-3 text-left font-medium text-slate-700">下次跟进</th>
                <th className="px-4 py-3 text-left font-medium text-slate-700">操作</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr
                  key={c.id}
                  className="cursor-pointer border-b border-slate-100 hover:bg-slate-50"
                  onClick={() => router.push(`/export/customers/${c.id}`)}
                >
                  <td className="px-4 py-3 font-medium text-slate-800">{c.customerCode}</td>
                  <td className="px-4 py-3 text-slate-600">
                    <div className="font-medium text-slate-800">{c.companyName}</div>
                    <div className="text-xs text-slate-500">
                      {normalizeWebsiteUrl(c.website) ? (
                        <a
                          href={normalizeWebsiteUrl(c.website)!}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-teal-600 hover:underline"
                        >
                          {getWebsiteHost(c.website)}
                        </a>
                      ) : (
                        "未填写官网"
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{c.country ?? "-"}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex flex-wrap items-center gap-1">
                      <span
                        className={`inline-flex rounded px-2 py-0.5 text-xs ${
                          c.status === "won"
                            ? "bg-green-50 text-green-700"
                            : c.status === "lost"
                              ? "bg-slate-100 text-slate-500"
                              : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {customerStatusLabel[c.status] ?? c.status}
                      </span>
                      {isCustomerOverdue(c) && (
                        <span className="rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-700">
                          超7天
                        </span>
                      )}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{c.owner.name}</td>
                  <td className="px-4 py-3 text-slate-500">
                    {c.lastFollowUpAt ? new Date(c.lastFollowUpAt).toLocaleDateString("zh-CN") : "-"}
                  </td>
                  <td
                    className={`px-4 py-3 ${
                      isNextFollowUpDue(c.nextFollowUpAt) ? "font-medium text-amber-600" : "text-slate-500"
                    }`}
                  >
                    {c.nextFollowUpAt ? (
                      <>
                        {new Date(c.nextFollowUpAt).toLocaleDateString("zh-CN")}
                        {isNextFollowUpDue(c.nextFollowUpAt) && (
                          <span className="ml-1 text-xs">(待跟进)</span>
                        )}
                      </>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <span className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => router.push(`/export/customers/${c.id}`)}
                        className="text-sm text-slate-500 hover:underline"
                      >
                        打开
                      </button>
                      <button
                        type="button"
                        onClick={() => setFollowUpCustomer(c)}
                        className="text-sm text-teal-600 hover:underline"
                      >
                        设置下次跟进
                      </button>
                      <Link href={`/export/customers/${c.id}`} className="text-teal-600 hover:underline">
                        详情
                      </Link>
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

      {followUpCustomer && (
        <NextFollowUpModal
          open={!!followUpCustomer}
          customerId={followUpCustomer.id}
          customerName={followUpCustomer.companyName}
          currentNextFollowUpAt={followUpCustomer.nextFollowUpAt}
          onClose={() => setFollowUpCustomer(null)}
          onSuccess={() => {
            toast("设置成功");
            fetchCustomers({ silent: true });
          }}
        />
      )}

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="新建客户" width="xl">
        <CustomerForm
          onSuccess={() => {
            setDrawerOpen(false);
            toast("保存成功");
            updateUrl({ page: 1 });
            fetchCustomers({ page: 1 });
          }}
          onCancel={() => setDrawerOpen(false)}
        />
      </Drawer>
    </div>
  );
}
