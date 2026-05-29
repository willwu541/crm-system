"use client";

import { useEffect, useMemo, useState } from "react";
import { useToast } from "@/components/ui/Toast";
import { parseResponseJson } from "@/lib/parse-response-json";
import { ACTIVITY_TYPES, ACTIVITY_DIRECTIONS } from "@/lib/export-constants";
import {
  activityDirectionLabel,
  activityTypeLabel,
  emailTemplateCategoryLabel,
  emailTemplateLanguageLabel,
} from "@/lib/export-display-labels";
import {
  buildLeadSocialLinks,
  buildMailtoUrl,
  defaultActivityTypeForChannel,
  type SocialChannel,
} from "@/lib/export/social-links";

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

export function QuickContactModal({
  open,
  onClose,
  onSuccess,
  leadId,
  customerId,
  contactCount = 0,
  defaultDirection = "outbound",
  defaultActivityType,
  contactEmail,
  contactWhatsapp,
  title,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  leadId?: string;
  customerId?: string;
  contactCount?: number;
  defaultDirection?: "outbound" | "inbound";
  defaultActivityType?: string;
  contactEmail?: string | null;
  contactWhatsapp?: string | null;
  title?: string;
}) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [templates, setTemplates] = useState<TemplateOption[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [rendering, setRendering] = useState(false);
  const [type, setType] = useState(defaultActivityType ?? "email");
  const [direction, setDirection] = useState<"outbound" | "inbound">(defaultDirection);
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [customerFeedback, setCustomerFeedback] = useState("");
  const [nextFollowUpAt, setNextFollowUpAt] = useState("");

  const recommendedCategory = useMemo(() => {
    if (direction === "inbound") return null;
    if (contactCount === 0) return "dev_letter";
    if (contactCount === 1) return "followup_1";
    if (contactCount === 2) return "followup_2";
    if (contactCount === 3) return "followup_3";
    return "long_tail";
  }, [contactCount, direction]);

  const socialLinks = useMemo(
    () => buildLeadSocialLinks({ email: contactEmail, whatsapp: contactWhatsapp }),
    [contactEmail, contactWhatsapp],
  );

  useEffect(() => {
    if (!open) {
      setError("");
      setSubject("");
      setContent("");
      setCustomerFeedback("");
      setNextFollowUpAt("");
      setSelectedTemplateId("");
      setType(defaultActivityType ?? "email");
      setDirection(defaultDirection);
    }
  }, [open, defaultDirection, defaultActivityType]);

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
          `/api/export/templates/${selectedTemplateId}/preview?${params}`,
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

  function applyChannel(channel: SocialChannel) {
    setType(defaultActivityTypeForChannel(channel));
  }

  async function copyEmail() {
    const text = subject ? `主题：${subject}\n\n${content}` : content;
    try {
      await navigator.clipboard.writeText(text);
      toast("已复制到剪贴板");
    } catch {
      toast("复制失败", "error");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const body: Record<string, unknown> = {
        customerId: customerId || undefined,
        leadId: leadId || undefined,
        type,
        direction,
        subject: subject || undefined,
        content: content || undefined,
        templateId: selectedTemplateId || undefined,
      };
      if (direction === "inbound" && customerFeedback) {
        body.customerFeedback = customerFeedback;
      }
      if (nextFollowUpAt) {
        body.nextFollowUpAt = new Date(nextFollowUpAt).toISOString();
      }
      const res = await fetch("/api/export/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
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

  const mailto = buildMailtoUrl(contactEmail, subject, content);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50" onClick={onClose} aria-hidden />
      <form
        onSubmit={handleSubmit}
        className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-6 shadow-xl"
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

        {socialLinks.length > 0 && direction === "outbound" && (
          <div className="mb-3 rounded-md border border-slate-100 bg-slate-50 p-3">
            <p className="mb-2 text-xs font-medium text-slate-600">快捷打开渠道</p>
            <div className="flex flex-wrap gap-2">
              {socialLinks.map((link) => (
                <a
                  key={link.channel}
                  href={link.href}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => applyChannel(link.channel)}
                  className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-700 hover:bg-slate-100"
                >
                  {link.label}
                </a>
              ))}
            </div>
          </div>
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
                  推荐：{emailTemplateCategoryLabel[recommendedCategory] ?? recommendedCategory}（第 {contactCount + 1} 轮）
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

        {direction === "outbound" && (
          <div className="mt-3">
            <label className="mb-1 block text-xs font-medium text-slate-600">下次跟进（可选）</label>
            <input
              type="datetime-local"
              value={nextFollowUpAt}
              onChange={(e) => setNextFollowUpAt(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
        )}

        {direction === "outbound" && (
          <>
            <div className="mt-3">
              <label className="mb-1 block text-xs font-medium text-slate-600">主题</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={copyEmail}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-xs hover:bg-slate-50"
              >
                复制主题+正文
              </button>
              {mailto && (
                <a
                  href={mailto}
                  className="rounded-md border border-teal-300 bg-teal-50 px-3 py-1.5 text-xs text-teal-800 hover:bg-teal-100"
                >
                  用邮件客户端打开
                </a>
              )}
            </div>
          </>
        )}

        <div className="mt-3">
          <label className="mb-1 block text-xs font-medium text-slate-600">
            {direction === "inbound" ? "沟通摘要" : "发送内容"}
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={direction === "inbound" ? 4 : 8}
            className="w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-xs"
          />
        </div>

        {direction === "inbound" && (
          <div className="mt-3">
            <label className="mb-1 block text-xs font-medium text-slate-600">客户反馈（重点）</label>
            <textarea
              value={customerFeedback}
              onChange={(e) => setCustomerFeedback(e.target.value)}
              rows={4}
              placeholder="客户说了什么、意向、下次要做什么…"
              className="w-full rounded-md border border-amber-200 bg-amber-50/50 px-3 py-2 text-sm"
            />
          </div>
        )}

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
