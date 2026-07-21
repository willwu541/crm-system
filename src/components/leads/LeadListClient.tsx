"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";
import { parseResponseJson } from "@/lib/parse-response-json";

const STATUS_LABELS: Record<string, string> = {
  NEW: "新线索",
  CONTACTED: "已联系",
  QUALIFIED: "已确认",
  CONVERTED: "已转化",
  LOST: "已流失",
};

const STATUS_COLORS: Record<string, string> = {
  NEW: "bg-blue-100 text-blue-700",
  CONTACTED: "bg-yellow-100 text-yellow-700",
  QUALIFIED: "bg-emerald-100 text-emerald-700",
  CONVERTED: "bg-purple-100 text-purple-700",
  LOST: "bg-slate-200 text-slate-600",
};

interface Lead {
  id: string;
  companyName: string;
  contactName: string;
  contactPhone: string;
  wechat?: string;
  region?: string;
  source?: string;
  productNeed?: string;
  intention?: string;
  status: string;
  remark?: string;
  ownerId: string;
  createdAt: string;
  owner: { id: string; name: string };
  customer?: { id: string; name: string } | null;
}

export function LeadListClient() {
  const { toast } = useToast();
  const router = useRouter();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [keyword, setKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [convertingId, setConvertingId] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  const pageSize = 20;

  async function fetchLeads() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("pageSize", String(pageSize));
      if (keyword) params.set("keyword", keyword);
      if (statusFilter) params.set("status", statusFilter);

      const res = await fetch(`/api/leads?${params}`);
      const json = await parseResponseJson<{ data: Lead[]; pagination: { total: number } }>(res);
      if (res.ok) {
        setLeads(json.data || []);
        setTotal(json.pagination?.total || 0);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchLeads(); }, [page, statusFilter]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    fetchLeads();
  }

  async function handleConvert(lead: Lead) {
    setConvertingId(lead.id);
    try {
      const res = await fetch(`/api/leads/${lead.id}/convert`, { method: "POST" });
      const json = await parseResponseJson<{ error?: string; data?: { customer: { id: string } } }>(res);
      if (!res.ok) {
        toast(json.error ?? "转化失败");
      } else {
        toast("转化成功");
        fetchLeads();
      }
    } catch (e) {
      toast(e instanceof Error ? e.message : "网络错误");
    } finally {
      setConvertingId(null);
    }
  }

  async function handleDelete(lead: Lead) {
    if (!confirm(`确认删除线索"${lead.companyName}"？`)) return;
    try {
      const res = await fetch(`/api/leads/${lead.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("删除失败");
      toast("删除成功");
      fetchLeads();
    } catch (e) {
      toast(e instanceof Error ? e.message : "删除失败");
    }
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const text = await file.text();
      const res = await fetch("/api/leads/import", {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: text,
      });
      const json = await parseResponseJson<{ error?: string; success?: number; skipped?: number }>(res);
      if (!res.ok) throw new Error(json.error ?? "导入失败");
      toast(`导入完成：成功 ${json.success ?? 0} 条，跳过 ${json.skipped ?? 0} 条`);
      fetchLeads();
    } catch (e) {
      toast(e instanceof Error ? e.message : "导入失败");
    } finally {
      setImporting(false);
      e.target.value = "";
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-4">
      {/* 搜索栏 */}
      <form onSubmit={handleSearch} className="flex flex-wrap gap-2">
        <input
          type="text"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="搜索公司/联系人/电话..."
          className="rounded-md border border-slate-300 px-3 py-2 text-sm w-64"
        />
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">全部状态</option>
          <option value="NEW">新线索</option>
          <option value="CONTACTED">已联系</option>
          <option value="QUALIFIED">已确认</option>
          <option value="CONVERTED">已转化</option>
          <option value="LOST">已流失</option>
        </select>
        <button type="submit" className="rounded-md bg-teal-600 px-4 py-2 text-sm text-white hover:bg-teal-700">
          搜索
        </button>
        <Link href="/leads/new" className="rounded-md bg-teal-600 px-4 py-2 text-sm text-white hover:bg-teal-700">
          新建线索
        </Link>
        <label className={`rounded-md ${importing ? "bg-slate-400" : "bg-amber-600 hover:bg-amber-700"} px-4 py-2 text-sm text-white cursor-pointer`}>
          {importing ? "导入中..." : "批量导入"}
          <input type="file" accept=".csv,.txt" onChange={handleImport} className="hidden" disabled={importing} />
        </label>
        <span className="ml-2 text-xs text-slate-400">支持CSV/TXT，列：公司,联系人,电话,微信,地区,来源,行业,需求,意向,备注</span>
      </form>

      {/* 列表 */}
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        {loading ? (
          <div className="p-8 text-center text-slate-500">加载中...</div>
        ) : leads.length === 0 ? (
          <div className="p-8 text-center text-slate-500">暂无线索</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-slate-700">公司</th>
                <th className="px-4 py-3 text-left font-medium text-slate-700">联系人</th>
                <th className="px-4 py-3 text-left font-medium text-slate-700">电话</th>
                <th className="px-4 py-3 text-left font-medium text-slate-700">意向</th>
                <th className="px-4 py-3 text-left font-medium text-slate-700">状态</th>
                <th className="px-4 py-3 text-left font-medium text-slate-700">负责人</th>
                <th className="px-4 py-3 text-left font-medium text-slate-700">创建时间</th>
                <th className="px-4 py-3 text-left font-medium text-slate-700">操作</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((l) => (
                <tr key={l.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium">{l.companyName}</td>
                  <td className="px-4 py-3">{l.contactName}</td>
                  <td className="px-4 py-3">{l.contactPhone}</td>
                  <td className="px-4 py-3">{l.intention || "-"}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded px-2 py-0.5 text-xs ${STATUS_COLORS[l.status] || "bg-slate-100"}`}>
                      {STATUS_LABELS[l.status] || l.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{l.owner?.name || "-"}</td>
                  <td className="px-4 py-3 text-slate-500">
                    {new Date(l.createdAt).toLocaleDateString("zh-CN")}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2 text-sm">
                      <Link href={`/leads/${l.id}`} className="text-teal-700 hover:underline">查看</Link>
                      {l.status !== "CONVERTED" && (
                        <button
                          type="button"
                          onClick={() => handleConvert(l)}
                          disabled={convertingId === l.id}
                          className="text-emerald-600 hover:underline disabled:opacity-50"
                        >
                          {convertingId === l.id ? "转化中..." : "转客户"}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDelete(l)}
                        className="text-red-600 hover:underline"
                      >
                        删除
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* 分页 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="rounded-md border px-3 py-1 text-sm disabled:opacity-50"
          >
            上一页
          </button>
          <span className="text-sm text-slate-600">第 {page}/{totalPages} 页 (共 {total} 条)</span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-md border px-3 py-1 text-sm disabled:opacity-50"
          >
            下一页
          </button>
        </div>
      )}
    </div>
  );
}
