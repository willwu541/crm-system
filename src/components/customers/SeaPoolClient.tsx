"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useToast } from "@/components/ui/Toast";
import { parseResponseJson } from "@/lib/parse-response-json";

interface PoolCustomer {
  id: string;
  name: string;
  contactName: string;
  contactPhone: string;
  wechat?: string;
  region?: string;
  source?: string;
  isDealLost: boolean;
  dealLostReason?: string;
  dealLostAt?: string;
  poolEnteredAt?: string;
  owner: { id: string; name: string };
}

export function SeaPoolClient() {
  const { toast } = useToast();
  const [customers, setCustomers] = useState<PoolCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [keyword, setKeyword] = useState("");
  const [claimingId, setClaimingId] = useState<string | null>(null);

  const pageSize = 20;

  async function fetchPool() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("pageSize", String(pageSize));
      if (keyword) params.set("keyword", keyword);

      const res = await fetch(`/api/customers/pool?${params}`);
      const json = await parseResponseJson<{ data: PoolCustomer[]; pagination: { total: number } }>(res);
      if (res.ok) {
        setCustomers(json.data || []);
        setTotal(json.pagination?.total || 0);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchPool(); }, [page]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    fetchPool();
  }

  async function handleClaim(customerId: string, name: string) {
    if (!confirm(`确认认领客户"${name}"？认领后需在 7 天内跟进。`)) return;
    setClaimingId(customerId);
    try {
      const res = await fetch("/api/customers/pool", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId }),
      });
      const json = await parseResponseJson<{ error?: string }>(res);
      if (!res.ok) throw new Error(json.error ?? "认领失败");
      toast(`已认领"${name}"`);
      fetchPool();
    } catch (e) {
      toast(e instanceof Error ? e.message : "认领失败");
    } finally {
      setClaimingId(null);
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-4">
      <form onSubmit={handleSearch} className="flex flex-wrap gap-2">
        <input
          type="text"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="搜索公司/联系人/电话..."
          className="rounded-md border border-slate-300 px-3 py-2 text-sm w-64"
        />
        <button type="submit" className="rounded-md bg-teal-600 px-4 py-2 text-sm text-white hover:bg-teal-700">
          搜索
        </button>
      </form>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        {loading ? (
          <div className="p-8 text-center text-slate-500">加载中...</div>
        ) : customers.length === 0 ? (
          <div className="p-8 text-center text-slate-500">公海暂无客户</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-slate-700">公司</th>
                <th className="px-4 py-3 text-left font-medium text-slate-700">联系人</th>
                <th className="px-4 py-3 text-left font-medium text-slate-700">电话</th>
                <th className="px-4 py-3 text-left font-medium text-slate-700">类型</th>
                <th className="px-4 py-3 text-left font-medium text-slate-700">原负责人</th>
                <th className="px-4 py-3 text-left font-medium text-slate-700">进入时间</th>
                <th className="px-4 py-3 text-left font-medium text-slate-700">操作</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium">{c.name}</td>
                  <td className="px-4 py-3">{c.contactName}</td>
                  <td className="px-4 py-3">{c.contactPhone}</td>
                  <td className="px-4 py-3">
                    {c.isDealLost ? (
                      <span className="rounded bg-red-100 px-2 py-0.5 text-xs text-red-700">
                        跑单{c.dealLostReason ? `(${c.dealLostReason})` : ""}
                      </span>
                    ) : (
                      <span className="rounded bg-yellow-100 px-2 py-0.5 text-xs text-yellow-700">释放</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-500">{c.owner?.name || "-"}</td>
                  <td className="px-4 py-3 text-slate-500">
                    {c.poolEnteredAt ? new Date(c.poolEnteredAt).toLocaleDateString("zh-CN") : "-"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2 text-sm">
                      <Link href={`/customers/${c.id}`} className="text-teal-700 hover:underline">详情</Link>
                      <button
                        type="button"
                        onClick={() => handleClaim(c.id, c.name)}
                        disabled={claimingId === c.id}
                        className="text-emerald-600 hover:underline disabled:opacity-50"
                      >
                        {claimingId === c.id ? "认领中..." : "认领"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-md border px-3 py-1 text-sm disabled:opacity-50">
            上一页
          </button>
          <span className="text-sm text-slate-600">第 {page}/{totalPages} 页 (共 {total} 条)</span>
          <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="rounded-md border px-3 py-1 text-sm disabled:opacity-50">
            下一页
          </button>
        </div>
      )}
    </div>
  );
}
