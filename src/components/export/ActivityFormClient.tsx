"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ACTIVITY_TYPES, ACTIVITY_DIRECTIONS } from "@/lib/export-constants";
import { parseResponseJson } from "@/lib/parse-response-json";
import {
  activityDirectionLabel,
  activityTypeLabel,
  emailTemplateCategoryLabel,
  emailTemplateLanguageLabel,
} from "@/lib/export-display-labels";

interface TemplateOption {
  id: string;
  name: string;
  category: string;
  language: string;
}

interface RenderedTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
}

/**
 * 用于「新增跟进」抽屉。
 * - 在 Customer 工作台传 customerId
 * - 在 Lead 详情 / Lead 列表传 leadId
 */
export function ActivityFormClient({
  customerId,
  leadId,
  contactId,
  defaultType = "email",
  defaultDirection = "outbound",
  /** 弹出后默认应用的模板分类，如 'dev_letter' / 'followup_1'，前端会自动选第一个匹配的模板并渲染 */
  defaultTemplateCategory,
  onSuccess,
  onCancel,
}: {
  customerId?: string;
  leadId?: string;
  contactId?: string;
  defaultType?: string;
  defaultDirection?: "outbound" | "inbound";
  defaultTemplateCategory?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [contacts, setContacts] = useState<{ id: string; name: string }[]>([]);
  const [templates, setTemplates] = useState<TemplateOption[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [previewing, setPreviewing] = useState(false);

  const [form, setForm] = useState({
    contactId: contactId ?? "",
    type: defaultType,
    direction: defaultDirection,
    subject: "",
    content: "",
    customerFeedback: "",
    nextFollowUpAt: "",
  });

  // 加载联系人（仅 Customer 阶段）
  useEffect(() => {
    let cancelled = false;
    if (!customerId) {
      setContacts([]);
      return;
    }
    (async () => {
      try {
        const r = await fetch(`/api/export/contacts?customerId=${customerId}`);
        const json = await parseResponseJson<{ data?: { id: string; name: string }[] }>(r);
        if (!cancelled && json.data) setContacts(json.data);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [customerId]);

  // 加载可用模板列表
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(`/api/export/templates`);
        const json = await parseResponseJson<{ data?: TemplateOption[] }>(r);
        if (!cancelled && json.data) {
          setTemplates(json.data);
          // 自动选默认分类下的第一个模板
          if (defaultTemplateCategory) {
            const match = json.data.find((t) => t.category === defaultTemplateCategory);
            if (match) {
              setSelectedTemplateId(match.id);
            }
          }
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [defaultTemplateCategory]);

  // 选模板后自动 fetch 渲染后的 subject/body 填入表单
  useEffect(() => {
    if (!selectedTemplateId) return;
    let cancelled = false;
    (async () => {
      setPreviewing(true);
      try {
        const params = new URLSearchParams();
        if (customerId) params.set("customerId", customerId);
        if (leadId) params.set("leadId", leadId);
        if (form.contactId) params.set("contactId", form.contactId);
        const r = await fetch(
          `/api/export/templates/${selectedTemplateId}/preview?${params}`
        );
        const json = await parseResponseJson<{ data?: RenderedTemplate; error?: string }>(r);
        if (cancelled) return;
        if (json.data) {
          setForm((f) => ({
            ...f,
            subject: json.data!.subject,
            content: json.data!.body,
          }));
        }
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setPreviewing(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedTemplateId, customerId, leadId, form.contactId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/export/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: customerId || undefined,
          leadId: leadId || undefined,
          contactId: form.contactId || undefined,
          type: form.type,
          direction: form.direction,
          subject: form.subject || undefined,
          content: form.content || undefined,
          customerFeedback: form.customerFeedback || undefined,
          templateId: selectedTemplateId || undefined,
          nextFollowUpAt: form.nextFollowUpAt
            ? new Date(form.nextFollowUpAt).toISOString()
            : undefined,
        }),
      });
      const json = await parseResponseJson<{ error?: string }>(res);
      if (!res.ok) throw new Error(json.error ?? "保存失败");
      if (onSuccess) {
        onSuccess();
        return;
      }
      if (customerId) {
        router.push(`/export/customers/${customerId}`);
      } else if (leadId) {
        router.push(`/export/leads/${leadId}`);
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存失败");
    } finally {
      setLoading(false);
    }
  }

  const groupedTemplates = useMemo(() => {
    const m = new Map<string, TemplateOption[]>();
    templates.forEach((t) => {
      const list = m.get(t.category) ?? [];
      list.push(t);
      m.set(t.category, list);
    });
    return m;
  }, [templates]);

  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-2xl space-y-4 rounded-lg border border-slate-200 bg-white p-6"
    >
      {error && (
        <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">类型 *</label>
          <select
            value={form.type}
            onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
            required
            className="w-full rounded-md border border-slate-300 px-3 py-2"
          >
            {ACTIVITY_TYPES.map((t) => (
              <option key={t} value={t}>
                {activityTypeLabel[t] ?? t}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">方向</label>
          <select
            value={form.direction}
            onChange={(e) =>
              setForm((f) => ({ ...f, direction: e.target.value as "outbound" | "inbound" }))
            }
            className="w-full rounded-md border border-slate-300 px-3 py-2"
          >
            {ACTIVITY_DIRECTIONS.map((d) => (
              <option key={d} value={d}>
                {activityDirectionLabel[d] ?? d}
              </option>
            ))}
          </select>
        </div>

        {customerId && (
          <div className="sm:col-span-2">
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
        )}

        {templates.length > 0 && (
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium text-slate-700">
              套用邮件 / 沟通模板
              {previewing && <span className="ml-2 text-xs text-slate-400">渲染中...</span>}
            </label>
            <select
              value={selectedTemplateId}
              onChange={(e) => setSelectedTemplateId(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2"
            >
              <option value="">不使用模板（手动填写）</option>
              {Array.from(groupedTemplates.entries()).map(([category, list]) => (
                <optgroup
                  key={category}
                  label={emailTemplateCategoryLabel[category] ?? category}
                >
                  {list.map((t) => (
                    <option key={t.id} value={t.id}>
                      [{emailTemplateLanguageLabel[t.language] ?? t.language}] {t.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            {selectedTemplateId && (
              <p className="mt-1 text-xs text-slate-500">
                已自动填充主题与正文。可在下方继续修改后再保存。
              </p>
            )}
          </div>
        )}

        <div className="sm:col-span-2">
          <label className="mb-1 block text-sm font-medium text-slate-700">主题</label>
          <input
            type="text"
            value={form.subject}
            onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
            className="w-full rounded-md border border-slate-300 px-3 py-2"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-sm font-medium text-slate-700">
            内容
            {form.direction === "inbound" && (
              <span className="ml-2 text-xs text-slate-400">（建议简要记录客户的关键反馈）</span>
            )}
          </label>
          <textarea
            value={form.content}
            onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
            rows={8}
            className="w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-sm"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-sm font-medium text-slate-700">客户反馈</label>
          <textarea
            value={form.customerFeedback}
            onChange={(e) => setForm((f) => ({ ...f, customerFeedback: e.target.value }))}
            rows={2}
            className="w-full rounded-md border border-slate-300 px-3 py-2"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">下次跟进</label>
          <input
            type="datetime-local"
            value={form.nextFollowUpAt}
            onChange={(e) => setForm((f) => ({ ...f, nextFollowUpAt: e.target.value }))}
            className="w-full rounded-md border border-slate-300 px-3 py-2"
          />
        </div>
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
        >
          {loading ? "保存中..." : "保存"}
        </button>
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50"
          >
            取消
          </button>
        ) : (
          <Link
            href={
              customerId
                ? `/export/customers/${customerId}`
                : leadId
                  ? `/export/leads/${leadId}`
                  : "/export/dashboard"
            }
            className="rounded-md border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50"
          >
            取消
          </Link>
        )}
      </div>
    </form>
  );
}
