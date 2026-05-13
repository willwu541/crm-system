"use client";

import { useEffect, useMemo, useState } from "react";
import { parseResponseJson } from "@/lib/parse-response-json";
import { ACTIVITY_TYPES, ACTIVITY_DIRECTIONS } from "@/lib/export-constants";
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
 * 轻量小弹窗，用于在 Leads / Customers 列表行内快速记录一次沟通。
 * - 自动按当前轮次推荐模板分类（线索阶段：dev_letter/followup_1/followup_2/followup_3/long_tail）
 * - 默认 outbound，可切 inbound
 * - 提交后调用 /api/export/activities POST
 */
export function QuickContactModal({
  open,
  onClose,
  onSuccess,
  leadId,
  customerId,
  contactCount = 0,
  defaultDirection = "outbound",
  title,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  leadId?: string;
  customerId?: string;
  /** 用于推荐模板分类（轮次） */
  contactCount?: number;
  defaultDirection?: "outbound" | "inbound";
  title?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [templates, setTemplates] = useState<TemplateOption[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [rendering, setRendering] = useState(false);
  const [type, setType] = useState("email");
  const [direction, setDirection] = useState<"outbound" | "inbound">(defaultDirection);
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");

  // 推荐的分类（依据轮次）
  const recommendedCategory = useMemo(() => {
    if (direction === "inbound") return null; // 客户回复不套模板
    if (contactCount === 0) return "dev_letter";
    if (contactCount === 1) return "followup_1";
    if (contactCount === 2) return "followup_2";
    if (contactCount === 3) return "followup_3";
    return "long_tail";
  }, [contactCount, direction]);

  // 关闭时清空
  useEffect(() => {
    if (!open) {
      setError("");
      setSubject("");
      setContent("");
      setSelectedTemplateId("");
      setType("email");
      setDirection(defaultDirection);
    }
  }, [open, defaultDirection]);

  // 拉模板
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(`/api/export/templates`);
        const json = await parseResponseJson<{ data?: TemplateOption[] }>(r);
        if (cancelled) return;
        const list = json.data ?? [];
        setTemplates(list);
        // 自动选推荐分类下的第一个（优先英文）
        if (recommendedCategory) {
          const match =
            list.find((t) => t.category === recommendedCategory && t.language === "en") ??
            list.find((t) => t.category === recommendedCategory);
          if (match) setSelectedTemplateId(match.id);
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, recommendedCategory]);

  // 选模板后渲染预览
  useEffect(() => {
    if (!open || !selectedTemplateId) return;
    let cancelled = false;
    (async () => {
      setRendering(true);
      try {
        const params = new URLSearchParams();
        if (leadId) params.set("leadId", leadId);
        if (customerId) params.set("customerId", customerId);
        const r = await fetch(
          `/api/export/templates/${selectedTemplateId}/preview?${params}`
        );
        const json = await parseResponseJson<{ data?: RenderedTemplate; error?: string }>(r);
        if (cancelled) return;
        if (json.data) {
          setSubject(json.data.subject);
          setContent(json.data.body);
        }
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setRendering(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedTemplateId, leadId, customerId, open]);

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
          type,
          direction,
          subject: subject || undefined,
          content: content || undefined,
          templateId: selectedTemplateId || undefined,
        }),
      });
      const json = await parseResponseJson<{ error?: string }>(res);
      if (!res.ok) throw new Error(json.error ?? "保存失败");
      if (onSuccess) onSuccess();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存失败");
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  const groupedTemplates = new Map<string, TemplateOption[]>();
  templates.forEach((t) => {
    const list = groupedTemplates.get(t.category) ?? [];
    list.push(t);
    groupedTemplates.set(t.category, list);
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50" onClick={onClose} aria-hidden />
      <form
        onSubmit={handleSubmit}
        className="relative w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-800">
            {title ?? "快速记录一次沟通"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-slate-500 hover:bg-slate-100"
            aria-label="关闭"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="mb-3 rounded bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">类型</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              {ACTIVITY_TYPES.map((t) => (
                <option key={t} value={t}>
                  {activityTypeLabel[t] ?? t}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">方向</label>
            <select
              value={direction}
              onChange={(e) => setDirection(e.target.value as "outbound" | "inbound")}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              {ACTIVITY_DIRECTIONS.map((d) => (
                <option key={d} value={d}>
                  {activityDirectionLabel[d] ?? d}
                </option>
              ))}
            </select>
          </div>
        </div>

        {direction === "outbound" && (
          <div className="mt-3">
            <label className="mb-1 block text-xs font-medium text-slate-600">
              套用模板
              {recommendedCategory && (
                <span className="ml-2 text-[11px] text-teal-600">
                  推荐：{emailTemplateCategoryLabel[recommendedCategory] ?? recommendedCategory}（本次第 {contactCount + 1} 轮联系）
                </span>
              )}
              {rendering && <span className="ml-2 text-[11px] text-slate-400">渲染中...</span>}
            </label>
            <select
              value={selectedTemplateId}
              onChange={(e) => setSelectedTemplateId(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">不使用模板（手动填写）</option>
              {Array.from(groupedTemplates.entries()).map(([cat, list]) => (
                <optgroup key={cat} label={emailTemplateCategoryLabel[cat] ?? cat}>
                  {list.map((t) => (
                    <option key={t.id} value={t.id}>
                      [{emailTemplateLanguageLabel[t.language] ?? t.language}] {t.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
        )}

        <div className="mt-3">
          <label className="mb-1 block text-xs font-medium text-slate-600">主题</label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div className="mt-3">
          <label className="mb-1 block text-xs font-medium text-slate-600">
            内容
            {direction === "outbound" && (
              <span className="ml-2 text-[11px] text-slate-400">
                建议直接复制到邮箱发送
              </span>
            )}
            {direction === "inbound" && (
              <span className="ml-2 text-[11px] text-slate-400">
                简要记录客户的关键反馈
              </span>
            )}
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={10}
            className="w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-xs"
          />
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50"
          >
            取消
          </button>
          <button
            type="submit"
            disabled={loading}
            className="rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
          >
            {loading ? "保存中..." : "保存"}
          </button>
        </div>
      </form>
    </div>
  );
}
