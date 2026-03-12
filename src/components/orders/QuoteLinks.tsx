"use client";

import { useState, useEffect } from "react";

interface QuoteLink {
  id: string;
  token: string;
  supplierName: string | null;
  expiresAt: string | null;
  createdAt: string;
  quoteUrl?: string;
}

interface Props {
  orderId: string;
}

export function QuoteLinks({ orderId }: Props) {
  const [links, setLinks] = useState<QuoteLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [expiresInDays, setExpiresInDays] = useState(7);
  const [supplierName, setSupplierName] = useState("");
  const [error, setError] = useState("");

  async function fetchLinks() {
    setLoading(true);
    try {
      const res = await fetch(`/api/orders/${orderId}/quote-links`);
      const json = await res.json();
      if (res.ok) setLinks(json.data || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchLinks();
  }, [orderId]);

  async function createLink() {
    setCreating(true);
    setError("");
    try {
      const res = await fetch(`/api/orders/${orderId}/quote-links`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplierName: supplierName.trim() || undefined,
          expiresInDays: expiresInDays > 0 ? expiresInDays : undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "生成失败");
      setLinks((prev) => [json.data, ...prev]);
      setSupplierName("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "生成失败");
    } finally {
      setCreating(false);
    }
  }

  function copyUrl(url: string) {
    navigator.clipboard.writeText(url);
    alert("链接已复制到剪贴板");
  }

  if (loading) return <div className="text-slate-500">加载中...</div>;

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-xs text-slate-600">供应商备注（可选）</label>
          <input
            type="text"
            value={supplierName}
            onChange={(e) => setSupplierName(e.target.value)}
            placeholder="如：XX加工厂"
            className="rounded border border-slate-300 px-2 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-600">链接有效期（天）</label>
          <input
            type="number"
            min="0"
            value={expiresInDays}
            onChange={(e) => setExpiresInDays(Number(e.target.value) || 0)}
            className="w-20 rounded border border-slate-300 px-2 py-1.5 text-sm"
          />
        </div>
        <button
          type="button"
          onClick={createLink}
          disabled={creating}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {creating ? "生成中..." : "生成外协链接"}
        </button>
      </div>

      <div className="space-y-2">
        {links.length === 0 ? (
          <p className="text-sm text-slate-500">暂无外协链接</p>
        ) : (
          links.map((link) => {
            const url = link.quoteUrl || `${window.location.origin}/quote/${link.token}`;
            const expired = link.expiresAt ? new Date(link.expiresAt) < new Date() : false;
            return (
              <div
                key={link.id}
                className="flex items-center justify-between rounded border border-slate-200 bg-slate-50 p-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm text-slate-800">
                    {link.supplierName || "未命名"}
                    {expired && (
                      <span className="ml-2 text-red-600">已过期</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={url}
                      className="flex-1 truncate rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600"
                    />
                    <button
                      type="button"
                      onClick={() => copyUrl(url)}
                      className="rounded bg-slate-200 px-2 py-1 text-xs hover:bg-slate-300"
                    >
                      复制
                    </button>
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    创建于 {new Date(link.createdAt).toLocaleString("zh-CN")}
                    {link.expiresAt && ` · 过期 ${new Date(link.expiresAt).toLocaleString("zh-CN")}`}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
