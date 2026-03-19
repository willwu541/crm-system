"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { TASK_STATUSES } from "@/lib/export-constants";
import { buildListUrl } from "@/lib/export/url-params";
import { Pagination } from "./shared/Pagination";

interface Task {
  id: string;
  title: string;
  dueDate: string | null;
  priority: string;
  status: string;
  customer: { id: string; companyName: string } | null;
  owner: { name: string };
  createdAt: string;
}

interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

const PRIORITY_LABELS: Record<string, string> = {
  low: "低",
  medium: "中",
  high: "高",
  urgent: "紧急",
};

const STATUS_LABELS: Record<string, string> = {
  todo: "待办",
  in_progress: "进行中",
  done: "完成",
  overdue: "超期",
};

export function TasksClient() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const due = searchParams.get("due") ?? "";
  const status = searchParams.get("status") ?? "";
  const ownerId = searchParams.get("ownerId") ?? "";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const keywordParam = searchParams.get("keyword") ?? "";
  const [tasks, setTasks] = useState<Task[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState(keywordParam);
  const [users, setUsers] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    setKeyword(keywordParam);
  }, [keywordParam]);

  function updateUrl(updates: Record<string, string | number | undefined>) {
    const merged = {
      due: due || undefined,
      status: status || undefined,
      ownerId: ownerId || undefined,
      keyword: keyword || undefined,
      page,
      ...updates,
    };
    router.replace(buildListUrl(pathname, merged));
  }

  async function fetchUsers() {
    try {
      const res = await fetch("/api/export/users");
      const json = await res.json();
      if (res.ok && json.data) setUsers(json.data);
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchTasks(overrides?: { page?: number }) {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(overrides?.page ?? page));
      if (due) params.set("due", due);
      if (status) params.set("status", status);
      if (keyword) params.set("keyword", keyword);
      if (ownerId) params.set("ownerId", ownerId);
      const res = await fetch(`/api/export/tasks?${params}`);
      if (!res.ok) throw new Error("加载失败");
      const json = await res.json();
      setTasks(json.data || []);
      setPagination(json.pagination);
    } catch (e) {
      console.error(e);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchTasks();
  }, [page, due, status, keyword, ownerId]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
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
            placeholder="任务/备注"
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <select
            value={due}
            onChange={(e) => {
              const v = e.target.value || undefined;
              updateUrl({ due: v, status: v === "today" ? undefined : status, page: 1 });
            }}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">全部</option>
            <option value="today">今日到期</option>
          </select>
          <select
            value={status}
            onChange={(e) => {
              const v = e.target.value || undefined;
              updateUrl({ status: v, due: v === "overdue" ? undefined : due, page: 1 });
            }}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">全部状态</option>
            <option value="overdue">超期任务</option>
            {TASK_STATUSES.filter((s) => s !== "overdue").map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s] ?? s}
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
          <button type="submit" className="rounded-md bg-slate-700 px-4 py-2 text-sm text-white hover:bg-slate-800">
            搜索
          </button>
        </form>
        <Link
          href="/export/tasks/new"
          className="rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
        >
          新建任务
        </Link>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        {loading ? (
          <div className="p-8 text-center text-slate-500">加载中...</div>
        ) : tasks.length === 0 ? (
          <div className="p-8 text-center text-slate-500">暂无任务</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-slate-700">任务</th>
                <th className="px-4 py-3 text-left font-medium text-slate-700">客户</th>
                <th className="px-4 py-3 text-left font-medium text-slate-700">优先级</th>
                <th className="px-4 py-3 text-left font-medium text-slate-700">状态</th>
                <th className="px-4 py-3 text-left font-medium text-slate-700">截止</th>
                <th className="px-4 py-3 text-left font-medium text-slate-700">负责人</th>
                <th className="px-4 py-3 text-left font-medium text-slate-700">操作</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((t) => (
                <tr
                  key={t.id}
                  className="cursor-pointer border-b border-slate-100 hover:bg-slate-50"
                  onClick={() => (window.location.href = `/export/tasks/${t.id}`)}
                >
                  <td className="px-4 py-3 font-medium text-slate-800">{t.title}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {t.customer ? (
                      <Link href={`/export/customers/${t.customer.id}`} className="text-teal-600 hover:underline">
                        {t.customer.companyName}
                      </Link>
                    ) : "-"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded px-2 py-0.5 text-xs ${
                        t.priority === "urgent"
                          ? "bg-red-50 text-red-700"
                          : t.priority === "high"
                            ? "bg-amber-50 text-amber-700"
                            : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {PRIORITY_LABELS[t.priority] ?? t.priority}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {(() => {
                      const isOverdue = t.status !== "done" && t.dueDate && new Date(t.dueDate) < new Date(new Date().setHours(0, 0, 0, 0));
                      return (
                        <span
                          className={`inline-flex rounded px-2 py-0.5 text-xs ${
                            isOverdue
                              ? "bg-red-100 text-red-700"
                              : t.status === "done"
                                ? "bg-green-50 text-green-700"
                                : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {isOverdue ? "超期" : STATUS_LABELS[t.status] ?? t.status}
                        </span>
                      );
                    })()}
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {t.dueDate ? new Date(t.dueDate).toLocaleDateString("zh-CN") : "-"}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{t.owner.name}</td>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <Link href={`/export/tasks/${t.id}`} className="text-teal-600 hover:underline">
                      详情
                    </Link>
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
    </div>
  );
}
