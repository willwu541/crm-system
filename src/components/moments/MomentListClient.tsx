"use client";

import { useState, useEffect } from "react";
import { useToast } from "@/components/ui/Toast";
import { parseResponseJson } from "@/lib/parse-response-json";

const CATEGORY_LABELS: Record<string, string> = { "产品展示": "产品展示", "案例分享": "案例分享", "行业资讯": "行业资讯", "促销活动": "促销活动" };

interface Moment { id: string; content: string; category?: string; mediaUrls: string[]; isActive: boolean; createdAt: string; createdBy: { id: string; name: string }; }

export function MomentListClient() {
  const { toast } = useToast();
  const [moments, setMoments] = useState<Moment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("产品展示");
  const [submitting, setSubmitting] = useState(false);

  async function fetchMoments() {
    setLoading(true);
    try {
      const res = await fetch("/api/moments");
      const json = await parseResponseJson<{ data: Moment[] }>(res);
      if (res.ok) setMoments(json.data || []);
    } finally { setLoading(false); }
  }

  useEffect(() => { fetchMoments(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/moments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: content.trim(), category }) });
      if (!res.ok) throw new Error("创建失败");
      toast("文案已添加");
      setShowForm(false); setContent("");
      fetchMoments();
    } catch (e) { toast(e instanceof Error ? e.message : "创建失败"); }
    finally { setSubmitting(false); }
  }

  async function handleToggleActive(id: string, isActive: boolean) {
    await fetch(`/api/moments/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isActive: !isActive }) });
    fetchMoments();
  }

  async function handleDelete(id: string) {
    if (!confirm("确认删除此文案？")) return;
    await fetch(`/api/moments/${id}`, { method: "DELETE" });
    toast("已删除");
    fetchMoments();
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setShowForm(!showForm)} className="rounded-md bg-teal-600 px-4 py-2 text-sm text-white hover:bg-teal-700">{showForm ? "取消" : "添加文案"}</button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="rounded-lg border border-slate-200 bg-white p-4 space-y-3">
          <div className="flex gap-2"><select value={category} onChange={(e) => setCategory(e.target.value)} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm">{Object.keys(CATEGORY_LABELS).map(c => <option key={c} value={c}>{c}</option>)}</select></div>
          <textarea value={content} onChange={(e) => setContent(e.target.value)} required placeholder="输入朋友圈文案内容..." rows={4} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <button type="submit" disabled={submitting} className="rounded-md bg-teal-600 px-4 py-2 text-sm text-white hover:bg-teal-700 disabled:opacity-50">{submitting ? "添加中" : "添加"}</button>
        </form>
      )}

      <div className="space-y-3">
        {loading ? <div className="p-8 text-center text-slate-500">加载中...</div> : moments.length === 0 ? <div className="p-8 text-center text-slate-500">暂无文案</div> : moments.map(m => (
          <div key={m.id} className={`rounded-lg border p-4 ${m.isActive ? "bg-white border-slate-200" : "bg-slate-50 border-slate-100"}`}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  {m.category && <span className="rounded bg-teal-100 px-2 py-0.5 text-xs text-teal-700">{m.category}</span>}
                  <span className={`rounded px-2 py-0.5 text-xs ${m.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-500"}`}>{m.isActive ? "启用" : "停用"}</span>
                </div>
                <p className="text-sm text-slate-800 whitespace-pre-wrap">{m.content}</p>
                <div className="mt-2 text-xs text-slate-400">
                  创建人：{m.createdBy?.name} · {new Date(m.createdAt).toLocaleDateString("zh-CN")}
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <button onClick={() => handleToggleActive(m.id, m.isActive)} className="text-xs text-teal-700 hover:underline">{m.isActive ? "停用" : "启用"}</button>
                <button onClick={() => handleDelete(m.id)} className="text-xs text-red-600 hover:underline">删除</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
