"use client";

import { useEffect, useState } from "react";
import { parseResponseJson } from "@/lib/parse-response-json";
import { useToast } from "@/components/ui/Toast";
import { taskPriorityLabel, taskStatusLabel } from "@/lib/export-display-labels";

interface TaskRow {
  id: string;
  title: string;
  dueDate: string | null;
  priority: string;
  status: string;
}

export function LeadTasksPanel({ leadId }: { leadId: string }) {
  const { toast } = useToast();
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [loading, setLoading] = useState(false);

  async function load() {
    try {
      const r = await fetch(`/api/export/tasks?leadId=${leadId}&pageSize=20`);
      const json = await parseResponseJson<{ data?: TaskRow[] }>(r);
      if (json.data) setTasks(json.data);
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    load();
  }, [leadId]);

  async function addTask(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/export/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          leadId,
          dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
        }),
      });
      const json = await parseResponseJson<{ error?: string }>(res);
      if (!res.ok) throw new Error(json.error ?? "创建失败");
      setTitle("");
      setDueDate("");
      toast("任务已创建");
      load();
    } catch (e) {
      toast(e instanceof Error ? e.message : "创建失败", "error");
    } finally {
      setLoading(false);
    }
  }

  async function markDone(id: string) {
    try {
      const res = await fetch(`/api/export/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "done" }),
      });
      if (!res.ok) throw new Error("更新失败");
      load();
    } catch {
      toast("更新失败", "error");
    }
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <h2 className="mb-3 font-medium text-slate-700">跟进任务</h2>
      <form onSubmit={addTask} className="mb-3 flex flex-wrap gap-2">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="如：周二 WhatsApp 催回复"
          className="min-w-[200px] flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        <input
          type="datetime-local"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-teal-600 px-3 py-2 text-sm text-white hover:bg-teal-700 disabled:opacity-50"
        >
          添加
        </button>
      </form>
      {tasks.length === 0 ? (
        <p className="text-sm text-slate-500">暂无任务</p>
      ) : (
        <ul className="space-y-2 text-sm">
          {tasks.map((t) => (
            <li
              key={t.id}
              className="flex items-center justify-between rounded border border-slate-100 px-3 py-2"
            >
              <div>
                <p className="font-medium text-slate-800">{t.title}</p>
                <p className="text-xs text-slate-500">
                  {taskStatusLabel[t.status] ?? t.status}
                  {t.dueDate && ` · ${new Date(t.dueDate).toLocaleString("zh-CN")}`}
                  {" · "}
                  {taskPriorityLabel[t.priority] ?? t.priority}
                </p>
              </div>
              {t.status !== "done" && (
                <button
                  type="button"
                  onClick={() => markDone(t.id)}
                  className="text-xs text-teal-600 hover:underline"
                >
                  完成
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
