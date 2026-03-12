"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ConvertToOrderButton } from "./ConvertToOrderButton";

interface Opportunity {
  id: string;
  projectName: string;
  status: string;
  isQuoted: boolean;
  intentionLevel: string | null;
  customer: { name: string };
  createdBy: { name: string };
  createdAt: string;
  order?: { id: string };
}

const STATUS_MAP: Record<string, string> = {
  OPPORTUNITY: "商机中",
  CONVERTED: "已成交",
  CANCELLED: "已取消",
};

const INTENTION_MAP: Record<string, string> = {
  HIGH: "高",
  MEDIUM: "中",
  LOW: "低",
};

export function OpportunityList() {
  const [list, setList] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [keyword, setKeyword] = useState("");

  async function fetchList() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (status) params.set("status", status);
      if (keyword) params.set("keyword", keyword);
      const res = await fetch(`/api/opportunities?${params}`);
      const json = await res.json();
      if (res.ok) setList(json.data || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchList();
  }, [status]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    fetchList();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4">
        <div className="flex gap-2">
          {(["", "OPPORTUNITY", "CONVERTED", "CANCELLED"] as const).map((s) => (
            <button
              key={s || "all"}
              type="button"
              onClick={() => {
                setStatus(s);
                if (!s) fetchList();
              }}
              className={`rounded-md px-3 py-1.5 text-sm ${
                status === s
                  ? "bg-teal-600 text-white"
                  : "border border-slate-300 text-slate-700 hover:bg-slate-50"
              }`}
            >
              {s ? STATUS_MAP[s] : "全部"}
            </button>
          ))}
        </div>
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="项目/客户"
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="rounded-md bg-slate-700 px-4 py-2 text-sm text-white hover:bg-slate-800"
          >
            搜索
          </button>
        </form>
        <Link
          href="/opportunities/new"
          className="rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
        >
          新建商机
        </Link>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        {loading ? (
          <div className="p-8 text-center text-slate-500">加载中...</div>
        ) : list.length === 0 ? (
          <div className="p-8 text-center text-slate-500">暂无商机</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-slate-700">项目名称</th>
                <th className="px-4 py-3 text-left font-medium text-slate-700">客户</th>
                <th className="px-4 py-3 text-left font-medium text-slate-700">主状态</th>
                <th className="px-4 py-3 text-left font-medium text-slate-700">标签</th>
                <th className="px-4 py-3 text-left font-medium text-slate-700">创建人</th>
                <th className="px-4 py-3 text-left font-medium text-slate-700">操作</th>
              </tr>
            </thead>
            <tbody>
              {list.map((o) => (
                <tr key={o.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-800">{o.projectName}</td>
                  <td className="px-4 py-3 text-slate-600">{o.customer.name}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded px-2 py-0.5 text-xs ${
                        o.status === "OPPORTUNITY"
                          ? "bg-teal-50 text-teal-700"
                          : o.status === "CONVERTED"
                            ? "bg-green-50 text-green-700"
                            : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {STATUS_MAP[o.status] ?? o.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="flex gap-1">
                      {o.isQuoted && (
                        <span className="rounded bg-amber-50 px-2 py-0.5 text-xs text-amber-700">
                          已报价
                        </span>
                      )}
                      {o.intentionLevel && (
                        <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                          意向{INTENTION_MAP[o.intentionLevel]}
                        </span>
                      )}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{o.createdBy.name}</td>
                  <td className="px-4 py-3">
                    <span className="flex gap-3">
                      <Link
                        href={`/opportunities/${o.id}`}
                        className="text-teal-600 hover:underline"
                      >
                        详情
                      </Link>
                      {o.status === "OPPORTUNITY" && (
                        <ConvertToOrderButton opportunityId={o.id} compact />
                      )}
                      {o.status === "CONVERTED" && o.order && (
                        <Link
                          href={`/orders/${o.order.id}`}
                          className="text-green-600 hover:underline"
                        >
                          查看订单
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
    </div>
  );
}
