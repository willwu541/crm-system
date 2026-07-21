"use client";

import { useState, useEffect } from "react";
import { useToast } from "@/components/ui/Toast";
import { parseResponseJson } from "@/lib/parse-response-json";

const TYPE_LABELS: Record<string, string> = { call: "电话", visit: "拜访", wechat: "微信", note: "备注", email: "邮件" };
const TYPE_COLORS: Record<string, string> = { call: "bg-blue-100 text-blue-700", visit: "bg-emerald-100 text-emerald-700", wechat: "bg-green-100 text-green-700", note: "bg-slate-100 text-slate-600", email: "bg-purple-100 text-purple-700" };
const OUTCOME_LABELS: Record<string, string> = { "有意向": "有意向 ✅", "待考虑": "待考虑 🤔", "拒绝": "拒绝 ❌", "已成交": "已成交 🎉" };

interface FollowUp { id: string; content: string; type: string; outcome?: string; nextPlan?: string; createdAt: string; createdBy: { id: string; name: string }; }

export function FollowUpTimeline({ customerId }: { customerId: string }) {
  const { toast } = useToast();
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [content, setContent] = useState("");
  const [type, setType] = useState("call");
  const [outcome, setOutcome] = useState("");
  const [nextPlan, setNextPlan] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function loadFollowUps() {
    setLoading(true);
    try {
      const res = await fetch(`/api/follow-ups?customerId=${customerId}`);
      const json = await parseResponseJson<{ data: FollowUp[] }>(res);
      if (res.ok) setFollowUps(json.data || []);
    } finally { setLoading(false); }
  }

  useEffect(() => { loadFollowUps(); }, [customerId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/follow-ups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId, content: content.trim(), type, outcome: outcome || undefined, nextPlan: nextPlan || undefined }),
      });
      if (!res.ok) throw new Error("保存失败");
      toast("跟进记录已保存");
      setShowForm(false); setContent(""); setOutcome(""); setNextPlan("");
      loadFollowUps();
    } catch (e) { toast(e instanceof Error ? e.message : "保存失败"); }
    finally { setSubmitting(false); }
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-medium text-slate-800">跟进记录</h2>
        <button onClick={() => setShowForm(!showForm)} className="rounded-md bg-teal-600 px-3 py-1.5 text-sm text-white hover:bg-teal-700">
          {showForm ? "取消" : "+ 添加记录"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-4 rounded-lg border border-teal-200 bg-teal-50/30 p-4 space-y-3">
          <div className="flex gap-2">
            {(["call", "visit", "wechat", "note"] as const).map(t => (
              <button key={t} type="button" onClick={() => setType(t)}
                className={`rounded-md px-3 py-1 text-xs ${type === t ? "bg-teal-600 text-white" : "border bg-white text-slate-600 hover:bg-slate-50"}`}>
                {TYPE_LABELS[t]}
              </button>
            ))}
          </div>
          <textarea value={content} onChange={(e) => setContent(e.target.value)} required placeholder="记录沟通内容..." rows={3}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <div className="flex gap-2">
            <select value={outcome} onChange={(e) => setOutcome(e.target.value)} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm flex-1">
              <option value="">跟进结果（可选）</option>
              <option value="有意向">有意向</option>
              <option value="待考虑">待考虑</option>
              <option value="拒绝">拒绝</option>
              <option value="已成交">已成交</option>
            </select>
            <button type="submit" disabled={submitting}
              className="rounded-md bg-teal-600 px-4 py-1.5 text-sm text-white hover:bg-teal-700 disabled:opacity-50">
              {submitting ? "保存中" : "保存"}
            </button>
          </div>
          <input type="text" value={nextPlan} onChange={(e) => setNextPlan(e.target.value)} placeholder="下一步计划（可选）"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
        </form>
      )}

      {loading ? <div className="py-4 text-center text-sm text-slate-400">加载中...</div> : followUps.length === 0 ? (
        <p className="py-4 text-center text-sm text-slate-400">暂无跟进记录</p>
      ) : (
        <div className="relative pl-6 border-l-2 border-slate-200 space-y-4">
          {followUps.map(f => (
            <div key={f.id} className="relative pb-1">
              <div className="absolute -left-[25px] top-1 h-3 w-3 rounded-full bg-teal-500 ring-2 ring-white" />
              <div className="flex items-center gap-2 mb-1">
                <span className={`rounded px-1.5 py-0.5 text-xs ${TYPE_COLORS[f.type]}`}>{TYPE_LABELS[f.type]}</span>
                {f.outcome && <span className="text-xs text-slate-500">{OUTCOME_LABELS[f.outcome] || f.outcome}</span>}
              </div>
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{f.content}</p>
              {f.nextPlan && <p className="mt-1 text-xs text-teal-600">下一步：{f.nextPlan}</p>}
              <p className="mt-1 text-xs text-slate-400">{f.createdBy.name} · {new Date(f.createdAt).toLocaleString("zh-CN")}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
