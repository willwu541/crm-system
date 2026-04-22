"use client";

import React, { useEffect, useState } from "react";
import { parseResponseJson } from "@/lib/parse-response-json";

const ENTITY_LABELS: Record<string, string> = {
  lead: "线索",
  customer: "客户",
  contact: "联系人",
  activity: "跟进",
  quote: "报价",
  order: "订单",
  task: "任务",
};

interface Row {
  id: string;
  entityType: string;
  recordId: string;
  summary: string | null;
  snapshot: unknown;
  createdAt: string;
  deletedBy: { name: string; email: string };
}

export function ExportDeletionsClient() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [entityType, setEntityType] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  async function load(p = page) {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("page", String(p));
      if (entityType) params.set("entityType", entityType);
      const res = await fetch(`/api/admin/export-deletions?${params}`);
      const json = await parseResponseJson<{
        error?: string;
        data?: Row[];
        pagination?: { totalPages?: number; page?: number };
      }>(res);
      if (!res.ok) throw new Error(json.error ?? "加载失败");
      setRows(json.data ?? []);
      setTotalPages(json.pagination?.totalPages ?? 1);
      setPage(json.pagination?.page ?? p);
    } catch (e) {
      setError(e instanceof Error ? e.message : "加载失败");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(1);
  }, [entityType]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm text-slate-600">
          类型
          <select
            value={entityType}
            onChange={(e) => setEntityType(e.target.value)}
            className="ml-2 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          >
            <option value="">全部</option>
            {Object.entries(ENTITY_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error && <div className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">{error}</div>}

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        {loading ? (
          <div className="p-8 text-center text-slate-500">加载中...</div>
        ) : rows.length === 0 ? (
          <div className="p-8 text-center text-slate-500">暂无记录</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-slate-700">时间</th>
                <th className="px-3 py-2 text-left font-medium text-slate-700">类型</th>
                <th className="px-3 py-2 text-left font-medium text-slate-700">摘要</th>
                <th className="px-3 py-2 text-left font-medium text-slate-700">操作人</th>
                <th className="px-3 py-2 text-left font-medium text-slate-700">详情</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <React.Fragment key={r.id}>
                  <tr className="border-b border-slate-100">
                    <td className="px-3 py-2 text-slate-600 whitespace-nowrap">
                      {new Date(r.createdAt).toLocaleString("zh-CN")}
                    </td>
                    <td className="px-3 py-2">{ENTITY_LABELS[r.entityType] ?? r.entityType}</td>
                    <td className="px-3 py-2 max-w-xs truncate" title={r.summary ?? ""}>
                      {r.summary ?? r.recordId}
                    </td>
                    <td className="px-3 py-2">
                      {r.deletedBy.name}
                      <span className="text-slate-400"> ({r.deletedBy.email})</span>
                    </td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        onClick={() => setExpanded((x) => (x === r.id ? null : r.id))}
                        className="text-teal-600 hover:underline"
                      >
                        {expanded === r.id ? "收起" : "查看快照"}
                      </button>
                    </td>
                  </tr>
                  {expanded === r.id && (
                    <tr className="bg-slate-50">
                      <td colSpan={5} className="px-3 py-3">
                        <pre className="max-h-96 overflow-auto rounded border border-slate-200 bg-white p-3 text-xs text-slate-800">
                          {JSON.stringify(r.snapshot, null, 2)}
                        </pre>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => load(page - 1)}
            className="rounded border border-slate-300 px-3 py-1 text-sm disabled:opacity-50"
          >
            上一页
          </button>
          <span className="text-sm text-slate-600">
            {page} / {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => load(page + 1)}
            className="rounded border border-slate-300 px-3 py-1 text-sm disabled:opacity-50"
          >
            下一页
          </button>
        </div>
      )}
    </div>
  );
}
