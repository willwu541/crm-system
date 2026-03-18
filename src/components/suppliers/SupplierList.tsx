"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Supplier {
  id: string;
  name: string;
  contactName: string;
  contactPhone: string;
  address: string | null;
}

export function SupplierList() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState("");

  async function fetchSuppliers() {
    setLoading(true);
    try {
      const params = keyword ? `?keyword=${encodeURIComponent(keyword)}` : "";
      const res = await fetch(`/api/suppliers${params}`);
      const json = await res.json();
      if (res.ok) setSuppliers(json.data || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchSuppliers();
  }, []);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    fetchSuppliers();
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="加工户名称/联系人/电话"
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
          href="/suppliers/new"
          className="rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
        >
          新增加工户
        </Link>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        {loading ? (
          <div className="p-8 text-center text-slate-500">加载中...</div>
        ) : suppliers.length === 0 ? (
          <div className="p-8 text-center text-slate-500">暂无加工户</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-slate-700">加工户名称</th>
                <th className="px-4 py-3 text-left font-medium text-slate-700">联系人</th>
                <th className="px-4 py-3 text-left font-medium text-slate-700">联系电话</th>
                <th className="px-4 py-3 text-left font-medium text-slate-700">地址</th>
                <th className="px-4 py-3 text-left font-medium text-slate-700">操作</th>
              </tr>
            </thead>
            <tbody>
              {suppliers.map((s) => (
                <tr key={s.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-800">{s.name}</td>
                  <td className="px-4 py-3 text-slate-600">{s.contactName}</td>
                  <td className="px-4 py-3 text-slate-600">{s.contactPhone}</td>
                  <td className="px-4 py-3 text-slate-500">{s.address || "-"}</td>
                  <td className="px-4 py-3">
                    <Link href={`/suppliers/${s.id}`} className="text-teal-600 hover:underline">
                      详情
                    </Link>
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
