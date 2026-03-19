"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Log {
  id: string;
  action: string;
  targetType: string;
  targetId: string;
  targetName: string;
  userId: string;
  userName: string;
  details: string | null;
  createdAt: string;
}

export function LogsClient() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [pagination, setPagination] = useState<{
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState("");
  const [targetType, setTargetType] = useState("");
  const [userName, setUserName] = useState("");
  const [page, setPage] = useState(1);

  async function fetchLogs() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      if (action) params.set("action", action);
      if (targetType) params.set("targetType", targetType);
      if (userName) params.set("userName", userName);
      const res = await fetch(`/api/admin/logs?${params}`);
      if (!res.ok) throw new Error("加载失败");
      const json = await res.json();
      setLogs(json.data);
      setPagination(json.pagination);
    } catch (e) {
      console.error(e);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchLogs();
  }, [page]);

  const ACTION_OPTIONS = [
    { value: "", label: "全部操作" },
    { value: "删除订单", label: "删除订单" },
    { value: "修改订单", label: "修改订单" },
    { value: "删除加工户", label: "删除加工户" },
    { value: "修改加工户", label: "修改加工户" },
    { value: "修改报价", label: "修改报价" },
    { value: "删除附件", label: "删除附件" },
  ];

  const TARGET_OPTIONS = [
    { value: "", label: "全部类型" },
    { value: "order", label: "订单" },
    { value: "supplier", label: "加工户" },
    { value: "quote", label: "报价" },
    { value: "attachment", label: "附件" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-800">操作日志</h1>
        <Link
          href="/admin/users"
          className="rounded-md border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50"
        >
          返回用户管理
        </Link>
      </div>

      <div className="flex flex-wrap gap-4">
        <select
          value={action}
          onChange={(e) => {
            setAction(e.target.value);
            setPage(1);
          }}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          {ACTION_OPTIONS.map((o) => (
            <option key={o.value || "all"} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <select
          value={targetType}
          onChange={(e) => {
            setTargetType(e.target.value);
            setPage(1);
          }}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          {TARGET_OPTIONS.map((o) => (
            <option key={o.value || "all"} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <input
          type="text"
          value={userName}
          onChange={(e) => setUserName(e.target.value)}
          placeholder="操作人"
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        <button
          onClick={() => {
            setPage(1);
            fetchLogs();
          }}
          className="rounded-md bg-slate-700 px-4 py-2 text-sm text-white hover:bg-slate-800"
        >
          查询
        </button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        {loading ? (
          <div className="p-8 text-center text-slate-500">加载中...</div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-slate-500">暂无日志</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-4 py-3 text-left font-medium text-slate-700">时间</th>
                <th className="px-4 py-3 text-left font-medium text-slate-700">操作</th>
                <th className="px-4 py-3 text-left font-medium text-slate-700">对象</th>
                <th className="px-4 py-3 text-left font-medium text-slate-700">操作人</th>
                <th className="px-4 py-3 text-left font-medium text-slate-700">详情</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-b border-slate-100">
                  <td className="px-4 py-3 text-slate-600">
                    {new Date(log.createdAt).toLocaleString("zh-CN")}
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-800">{log.action}</td>
                  <td className="px-4 py-3 text-slate-600">{log.targetName}</td>
                  <td className="px-4 py-3 text-slate-600">{log.userName}</td>
                  <td className="max-w-xs truncate px-4 py-3 text-slate-500" title={log.details ?? ""}>
                    {log.details ?? "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-600">共 {pagination.total} 条</span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="rounded border border-slate-300 px-3 py-1 text-sm disabled:opacity-50"
            >
              上一页
            </button>
            <span className="py-1 text-sm text-slate-600">
              {page} / {pagination.totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
              disabled={page >= pagination.totalPages}
              className="rounded border border-slate-300 px-3 py-1 text-sm disabled:opacity-50"
            >
              下一页
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
