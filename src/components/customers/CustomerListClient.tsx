"use client";

import { useState } from "react";
import Link from "next/link";
import { CUSTOMER_STATUS_LABELS } from "@/lib/domestic/customer-access";

export interface CustomerRow {
  id: string;
  name: string;
  contactName: string;
  contactPhone: string;
  wechat: string | null;
  status: string;
  tier: string;
  lastContactAt: string | null;
  nextFollowUpAt: string | null;
  owner: { name: string };
  _count: { recordings: number; orders: number };
}

export function CustomerListClient({ initialData }: { initialData: CustomerRow[] }) {
  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState("");
  const [pool, setPool] = useState("");
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState(initialData);

  async function search(page = 1) {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: "20" });
      if (keyword.trim()) params.set("keyword", keyword.trim());
      if (status) params.set("status", status);
      if (pool) params.set("pool", pool);
      const res = await fetch(`/api/customers?${params}`);
      const json = await res.json();
      if (res.ok) setRows(json.data);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <input
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="搜索客户/联系人/电话/微信"
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">全部状态</option>
          {Object.entries(CUSTOMER_STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <select
          value={pool}
          onChange={(e) => setPool(e.target.value)}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">全部归属</option>
          <option value="pool">公海客户</option>
          <option value="deal_lost">跑单客户</option>
          <option value="mine">我的客户</option>
        </select>
        <button
          type="button"
          onClick={() => search()}
          disabled={loading}
          className="rounded-md bg-teal-600 px-4 py-2 text-sm text-white hover:bg-teal-700 disabled:opacity-50"
        >
          {loading ? "搜索中..." : "搜索"}
        </button>
        <Link
          href="/customers/new"
          className="rounded-md bg-teal-600 px-4 py-2 text-sm text-white hover:bg-teal-700"
        >
          新建客户
        </Link>
        <Link
          href="/customers/reactivation"
          className="rounded-md border border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-800 hover:bg-amber-100"
        >
          私域唤醒
        </Link>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="px-4 py-3 text-left font-medium text-slate-700">客户名称</th>
              <th className="px-4 py-3 text-left font-medium text-slate-700">联系人</th>
              <th className="px-4 py-3 text-left font-medium text-slate-700">电话</th>
              <th className="px-4 py-3 text-left font-medium text-slate-700">微信</th>
              <th className="px-4 py-3 text-left font-medium text-slate-700">状态</th>
              <th className="px-4 py-3 text-left font-medium text-slate-700">最后联系</th>
              <th className="px-4 py-3 text-left font-medium text-slate-700">录音</th>
              <th className="px-4 py-3 text-left font-medium text-slate-700">负责人</th>
              <th className="px-4 py-3 text-left font-medium text-slate-700">操作</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-slate-500">
                  暂无客户，点击「新建客户」添加
                </td>
              </tr>
            ) : (
              rows.map((c) => (
                <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-800">
                    <div className="flex items-center gap-1.5">
                      {c.tier === "VIP" && <span className="text-amber-500" title="VIP客户">⭐</span>}
                      {c.name}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{c.contactName}</td>
                  <td className="px-4 py-3 text-slate-600">{c.contactPhone}</td>
                  <td className="px-4 py-3 text-slate-600">{c.wechat || "-"}</td>
                  <td className="px-4 py-3">
                    <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                      {CUSTOMER_STATUS_LABELS[c.status] ?? c.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {c.lastContactAt
                      ? new Date(c.lastContactAt).toLocaleDateString("zh-CN")
                      : "-"}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{c._count.recordings}</td>
                  <td className="px-4 py-3 text-slate-600">{c.owner.name}</td>
                  <td className="px-4 py-3">
                    <Link href={`/customers/${c.id}`} className="text-teal-600 hover:underline">
                      详情
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
