"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { TASK_PRIORITIES, TASK_STATUSES } from "@/lib/export-constants";
import { parseResponseJson } from "@/lib/parse-response-json";
import { taskPriorityLabel, taskStatusLabel } from "@/lib/export-display-labels";

export function TaskFormClient({
  taskId,
  initial,
  customerId: customerIdProp,
  leadId: leadIdProp,
  onSuccess,
  onCancel,
}: {
  taskId?: string;
  initial?: Record<string, unknown>;
  customerId?: string;
  leadId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const customerIdParam = customerIdProp ?? searchParams.get("customerId");
  const leadIdParam = leadIdProp ?? searchParams.get("leadId");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [customers, setCustomers] = useState<{ id: string; companyName: string }[]>([]);
  const [leads, setLeads] = useState<{ id: string; companyName: string }[]>([]);
  const [contacts, setContacts] = useState<{ id: string; name: string }[]>([]);
  const [linkedLead, setLinkedLead] = useState<{ id: string; companyName: string } | null>(null);
  const [linkedCustomer, setLinkedCustomer] = useState<{ id: string; companyName: string } | null>(null);
  const [form, setForm] = useState({
    title: (initial?.title as string) ?? "",
    customerId: (initial?.customerId as string) ?? customerIdParam ?? "",
    leadId: (initial?.leadId as string) ?? leadIdParam ?? "",
    contactId: (initial?.contactId as string) ?? "",
    dueDate: (initial?.dueDate ? new Date(initial.dueDate as string).toISOString().slice(0, 16) : "") ?? "",
    priority: (initial?.priority as string) ?? "medium",
    status: (initial?.status as string) ?? "todo",
    notes: (initial?.notes as string) ?? "",
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [cr, lr] = await Promise.all([
          fetch("/api/export/customers?pageSize=500"),
          fetch("/api/export/leads?pageSize=500"),
        ]);
        const cjson = await parseResponseJson<{ data?: { id: string; companyName: string }[] }>(cr);
        if (!cancelled && cjson.data) setCustomers(cjson.data);
        const ljson = await parseResponseJson<{ data?: { id: string; companyName: string; status: string }[] }>(lr);
        if (!cancelled && ljson.data) {
          setLeads(ljson.data.filter((l) => l.status !== "converted" && l.status !== "invalid"));
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (form.customerId) {
      (async () => {
        try {
          const r = await fetch(`/api/export/contacts?customerId=${form.customerId}`);
          const json = await parseResponseJson<{ data?: { id: string; name: string }[] }>(r);
          if (!cancelled && json.data) setContacts(json.data);
        } catch {
          if (!cancelled) setContacts([]);
        }
      })();
    } else {
      setContacts([]);
    }
    return () => {
      cancelled = true;
    };
  }, [form.customerId]);

  useEffect(() => {
    if (customerIdParam && !form.customerId) setForm((f) => ({ ...f, customerId: customerIdParam }));
  }, [customerIdParam]);

  useEffect(() => {
    if (leadIdParam && !form.leadId) setForm((f) => ({ ...f, leadId: leadIdParam }));
  }, [leadIdParam]);

  useEffect(() => {
    const id = form.leadId || leadIdParam;
    if (!id) {
      setLinkedLead(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(`/api/export/leads/${id}`);
        const json = await parseResponseJson<{ data?: { id: string; companyName: string } }>(r);
        if (!cancelled && r.ok && json.data) setLinkedLead(json.data);
      } catch {
        if (!cancelled) setLinkedLead(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [form.leadId, leadIdParam]);

  useEffect(() => {
    const id = form.customerId || customerIdParam;
    if (!id) {
      setLinkedCustomer(null);
      return;
    }
    const fromList = customers.find((c) => c.id === id);
    if (fromList) {
      setLinkedCustomer(fromList);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(`/api/export/customers/${id}`);
        const json = await parseResponseJson<{ data?: { id: string; companyName: string } }>(r);
        if (!cancelled && r.ok && json.data) setLinkedCustomer(json.data);
      } catch {
        if (!cancelled) setLinkedCustomer(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [form.customerId, customerIdParam, customers]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const url = taskId ? `/api/export/tasks/${taskId}` : "/api/export/tasks";
      const method = taskId ? "PATCH" : "POST";
      const payload = {
        ...form,
        customerId: form.customerId || undefined,
        leadId: form.leadId || undefined,
        contactId: form.contactId || undefined,
        dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : undefined,
      };
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await parseResponseJson<{ error?: string; data?: { id: string } }>(res);
      if (!res.ok) throw new Error(json.error ?? "保存失败");
      const createdTaskId = json.data?.id;
      if (!taskId && createdTaskId && files.length > 0) {
        for (const file of files) {
          const fd = new FormData();
          fd.append("file", file);
          fd.append("entityType", "export_task");
          fd.append("entityId", createdTaskId);
          const uploadRes = await fetch("/api/upload", { method: "POST", body: fd });
          if (!uploadRes.ok) {
            const uploadJson = await parseResponseJson<{ error?: string }>(uploadRes);
            throw new Error(uploadJson.error ?? "附件上传失败");
          }
        }
      }
      if (onSuccess) {
        onSuccess();
        return;
      }
      if (taskId) {
        router.refresh();
        return;
      }
      if (json.data?.id) router.push(`/export/tasks/${json.data.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="export-card max-w-xl space-y-4 p-6">
      <h1 className="text-xl font-semibold text-slate-800">{taskId ? "编辑任务" : "新建任务"}</h1>
      {error && (
        <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>
      )}
      {(linkedLead || linkedCustomer) && (
        <div className="rounded-lg border border-teal-100 bg-teal-50/60 px-3 py-2 text-sm text-teal-800">
          关联对象：
          {linkedCustomer ? (
            <Link href={`/export/customers/${linkedCustomer.id}`} className="ml-1 font-medium hover:underline">
              客户 · {linkedCustomer.companyName}
            </Link>
          ) : linkedLead ? (
            <Link href={`/export/leads/${linkedLead.id}`} className="ml-1 font-medium hover:underline">
              线索 · {linkedLead.companyName}
            </Link>
          ) : null}
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="mb-1 block text-sm font-medium text-slate-700">标题 *</label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            required
            className="w-full rounded-md border border-slate-300 px-3 py-2"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">客户</label>
          <select
            value={form.customerId}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                customerId: e.target.value,
                contactId: "",
                leadId: e.target.value ? "" : f.leadId,
              }))
            }
            disabled={!!leadIdParam}
            className="w-full rounded-md border border-slate-300 px-3 py-2 disabled:bg-slate-50 disabled:text-slate-500"
          >
            <option value="">无</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.companyName}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">线索</label>
          <select
            value={form.leadId}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                leadId: e.target.value,
                customerId: e.target.value ? "" : f.customerId,
                contactId: e.target.value ? "" : f.contactId,
              }))
            }
            disabled={!!customerIdParam}
            className="w-full rounded-md border border-slate-300 px-3 py-2 disabled:bg-slate-50 disabled:text-slate-500"
          >
            <option value="">无</option>
            {leads.map((l) => (
              <option key={l.id} value={l.id}>
                {l.companyName}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">联系人</label>
          <select
            value={form.contactId}
            onChange={(e) => setForm((f) => ({ ...f, contactId: e.target.value }))}
            className="w-full rounded-md border border-slate-300 px-3 py-2"
          >
            <option value="">无</option>
            {contacts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">截止时间</label>
          <input
            type="datetime-local"
            value={form.dueDate}
            onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
            className="w-full rounded-md border border-slate-300 px-3 py-2"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">优先级</label>
          <select
            value={form.priority}
            onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
            className="w-full rounded-md border border-slate-300 px-3 py-2"
          >
            {TASK_PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {taskPriorityLabel[p] ?? p}
              </option>
            ))}
          </select>
        </div>
        {taskId && (
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">状态</label>
            <select
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
              className="w-full rounded-md border border-slate-300 px-3 py-2"
            >
              {TASK_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {taskStatusLabel[s] ?? s}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">备注</label>
        <textarea
          value={form.notes}
          onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          rows={2}
          className="w-full rounded-md border border-slate-300 px-3 py-2"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">附件（可选）</label>
        <input
          type="file"
          multiple
          accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,image/*"
          onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        {files.length > 0 && (
          <p className="mt-1 text-xs text-slate-500">已选择 {files.length} 个文件，保存后自动上传。</p>
        )}
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={loading}
          className="export-btn-primary rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          {loading ? "保存中..." : "保存"}
        </button>
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="export-btn-secondary rounded-md px-4 py-2 text-sm"
          >
            取消
          </button>
        ) : (
          <Link
            href={taskId ? `/export/tasks/${taskId}` : "/export/tasks"}
            className="export-btn-secondary rounded-md px-4 py-2 text-sm"
          >
            取消
          </Link>
        )}
      </div>
    </form>
  );
}
