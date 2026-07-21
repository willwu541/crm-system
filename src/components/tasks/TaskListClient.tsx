"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useToast } from "@/components/ui/Toast";
import { parseResponseJson } from "@/lib/parse-response-json";

const PRIORITY_LABELS: Record<string, string> = { HIGH: "高", MEDIUM: "中", LOW: "低" };
const PRIORITY_COLORS: Record<string, string> = { HIGH: "text-red-600", MEDIUM: "text-yellow-600", LOW: "text-slate-500" };
const TYPE_LABELS: Record<string, string> = { follow_up: "跟进", quote: "报价", moment: "朋友圈", general: "通用" };

interface Task { id: string; title: string; type: string; dueDate?: string; priority: string; status: string; notes?: string; createdAt: string; customer?: { id: string; name: string } | null; lead?: { id: string; companyName: string } | null; }

export function TaskListClient() {
  const { toast } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("todo");
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState("MEDIUM");
  const [type, setType] = useState("general");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function fetchTasks() {
    setLoading(true);
    try {
      const res = await fetch(`/api/tasks?status=${filter}`);
      const json = await parseResponseJson<{ data: Task[] }>(res);
      if (res.ok) setTasks(json.data || []);
    } finally { setLoading(false); }
  }

  useEffect(() => { fetchTasks(); }, [filter]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/tasks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title, type, dueDate: dueDate || undefined, priority, notes: notes || undefined }) });
      if (!res.ok) throw new Error("创建失败");
      toast("任务已创建");
      setShowForm(false); setTitle(""); setDueDate(""); setPriority("MEDIUM"); setType("general"); setNotes("");
      fetchTasks();
    } catch (e) { toast(e instanceof Error ? e.message : "创建失败"); }
    finally { setSubmitting(false); }
  }

  async function handleDone(taskId: string) {
    try {
      await fetch(`/api/tasks/${taskId}`, { method: "PATCH" });
      fetchTasks();
    } catch (e) { toast("操作失败"); }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {["todo", "done"].map(s => <button key={s} onClick={() => setFilter(s)} className={`rounded-md px-3 py-1.5 text-sm ${filter === s ? "bg-teal-600 text-white" : "border text-slate-600 hover:bg-slate-50"}`}>{s === "todo" ? "待办" : "已完成"}</button>)}
        </div>
        <button onClick={() => setShowForm(!showForm)} className="rounded-md bg-teal-600 px-4 py-2 text-sm text-white hover:bg-teal-700">{showForm ? "取消" : "新建待办"}</button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="rounded-lg border border-slate-200 bg-white p-4 space-y-3">
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="待办标题" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <div className="flex gap-2">
            <select value={type} onChange={(e) => setType(e.target.value)} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"><option value="general">通用</option><option value="follow_up">跟进</option><option value="quote">报价</option><option value="moment">朋友圈</option></select>
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm" />
            <select value={priority} onChange={(e) => setPriority(e.target.value)} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"><option value="HIGH">高优先</option><option value="MEDIUM">中优先</option><option value="LOW">低优先</option></select>
            <button type="submit" disabled={submitting} className="rounded-md bg-teal-600 px-4 py-1.5 text-sm text-white hover:bg-teal-700 disabled:opacity-50">{submitting ? "创建中" : "创建"}</button>
          </div>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="备注（可选）" rows={2} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
        </form>
      )}

      <div className="space-y-2">
        {loading ? <div className="p-8 text-center text-slate-500">加载中...</div> : tasks.length === 0 ? <div className="p-8 text-center text-slate-500">{filter === "todo" ? "没有待办任务" : "暂无已完成任务"}</div> : tasks.map(t => (
          <div key={t.id} className={`flex items-start gap-3 rounded-lg border p-4 ${t.status === "done" ? "bg-slate-50 border-slate-100" : "bg-white border-slate-200"}`}>
            {t.status === "todo" && <button onClick={() => handleDone(t.id)} className="mt-0.5 h-5 w-5 rounded border border-slate-300 hover:bg-teal-50 flex-shrink-0" title="标记完成" />}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs rounded bg-slate-100 px-1.5 py-0.5">{TYPE_LABELS[t.type] || t.type}</span>
                <span className={`text-xs ${PRIORITY_COLORS[t.priority]}`}>[{PRIORITY_LABELS[t.priority]}]</span>
                {t.customer && <Link href={`/customers/${t.customer.id}`} className="text-xs text-teal-700 hover:underline">{t.customer.name}</Link>}
                {t.lead && <Link href={`/leads/${t.lead.id}`} className="text-xs text-teal-700 hover:underline">{t.lead.companyName}</Link>}
              </div>
              <p className={`text-sm mt-1 ${t.status === "done" ? "line-through text-slate-400" : "text-slate-800"}`}>{t.title}</p>
              <div className="mt-1 flex gap-3 text-xs text-slate-400">
                {t.dueDate && <span>截止：{new Date(t.dueDate).toLocaleDateString("zh-CN")}</span>}
                <span>创建：{new Date(t.createdAt).toLocaleDateString("zh-CN")}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
