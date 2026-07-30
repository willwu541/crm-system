"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useToast } from "@/components/ui/Toast";
import { TaskFormClient } from "./TaskFormClient";
import { ExportDeleteButton } from "./ExportDeleteButton";
import { parseResponseJson } from "@/lib/parse-response-json";
import { displayLabel, taskPriorityLabel, taskStatusLabel } from "@/lib/export-display-labels";

export function TaskDetailClient({ taskId }: { taskId: string }) {
  const { toast } = useToast();
  const [task, setTask] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [completing, setCompleting] = useState(false);

  async function fetchTask() {
    setLoading(true);
    try {
      const res = await fetch(`/api/export/tasks/${taskId}`);
      const json = await parseResponseJson<{ data?: Record<string, unknown> }>(res);
      if (res.ok && json.data) setTask(json.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchTask();
  }, [taskId]);

  if (loading) return <div className="p-8 text-center text-slate-500">加载中...</div>;
  if (!task) return <div className="p-8 text-center text-slate-500">任务不存在</div>;

  if (editing) {
    return (
      <div>
        <TaskFormClient
          taskId={taskId}
          initial={task}
          onSuccess={() => {
            toast("保存成功");
            setEditing(false);
            fetchTask();
          }}
          onCancel={() => setEditing(false)}
        />
        <button
          onClick={() => setEditing(false)}
          className="mt-4 text-sm text-slate-600 hover:underline"
        >
          取消编辑
        </button>
      </div>
    );
  }

  const customer = task.customer as { id: string; companyName: string } | undefined;
  const lead = task.lead as { id: string; companyName: string } | undefined;
  const contact = task.contact as { id: string; name: string } | undefined;

  async function handleComplete() {
    setCompleting(true);
    try {
      const res = await fetch(`/api/export/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "done" }),
      });
      const json = await parseResponseJson<{ error?: string }>(res);
      if (!res.ok) throw new Error(json.error ?? "更新失败");
      toast("任务已完成");
      fetchTask();
    } catch (e) {
      toast(e instanceof Error ? e.message : "更新失败", "error");
    } finally {
      setCompleting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">{String(task.title)}</h1>
          <p className="text-sm text-slate-500">
            {displayLabel(taskStatusLabel, task.status as string | undefined)} ·{" "}
            {displayLabel(taskPriorityLabel, task.priority as string | undefined)}
          </p>
        </div>
        <div className="flex gap-2">
          {task.status !== "done" && (
            <button
              onClick={handleComplete}
              disabled={completing}
              className="rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
            >
              {completing ? "处理中..." : "标记完成"}
            </button>
          )}
          <button
            onClick={() => setEditing(true)}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50"
          >
            编辑
          </button>
          <ExportDeleteButton
            apiPath={`/api/export/tasks/${taskId}`}
            redirectTo="/export/tasks"
            label="删除任务"
            className="rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700 hover:bg-red-100 disabled:opacity-50"
          />
          <Link
            href="/export/tasks"
            className="rounded-md border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50"
          >
            返回
          </Link>
        </div>
      </div>

      <div className="export-card p-6">
        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-slate-500">关联对象</dt>
            <dd>
              {customer ? (
                <Link href={`/export/customers/${customer.id}`} className="text-teal-600 hover:underline">
                  客户 · {customer.companyName}
                </Link>
              ) : lead ? (
                <Link href={`/export/leads/${lead.id}`} className="text-teal-600 hover:underline">
                  线索 · {lead.companyName}
                </Link>
              ) : (
                "-"
              )}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">联系人</dt>
            <dd>{contact?.name ?? "-"}</dd>
          </div>
          <div>
            <dt className="text-slate-500">截止时间</dt>
            <dd>{task.dueDate ? new Date(task.dueDate as string).toLocaleString("zh-CN") : "-"}</dd>
          </div>
          <div>
            <dt className="text-slate-500">优先级</dt>
            <dd>{displayLabel(taskPriorityLabel, task.priority as string | undefined)}</dd>
          </div>
          <div>
            <dt className="text-slate-500">状态</dt>
            <dd>
              <span className={`rounded px-2 py-0.5 text-xs ${task.status === "overdue" ? "bg-red-100 text-red-700" : "bg-slate-100"}`}>
                {displayLabel(taskStatusLabel, task.status as string | undefined)}
              </span>
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">负责人</dt>
            <dd>{task.owner && typeof task.owner === "object" && "name" in task.owner ? String((task.owner as { name: string }).name) : "-"}</dd>
          </div>
          {task.notes ? (
            <div className="sm:col-span-2">
              <dt className="text-slate-500">备注</dt>
              <dd className="mt-1 text-slate-700">{String(task.notes)}</dd>
            </div>
          ) : null}
        </dl>
      </div>
    </div>
  );
}
