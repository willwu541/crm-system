"use client";

import { useRef, useState } from "react";
import { parseResponseJson } from "@/lib/parse-response-json";
import {
  EMAIL_TEMPLATE_CATEGORIES,
  EMAIL_TEMPLATE_LANGUAGES,
} from "@/lib/export-constants";
import {
  emailTemplateCategoryLabel,
  emailTemplateLanguageLabel,
} from "@/lib/export-display-labels";
import { AVAILABLE_TEMPLATE_VARS } from "@/lib/export/template-vars";

interface TemplateFormProps {
  templateId?: string;
  initial?: Partial<{
    name: string;
    category: string;
    language: string;
    subject: string;
    body: string;
    isShared: boolean;
  }>;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function TemplateForm({ templateId, initial, onSuccess, onCancel }: TemplateFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const subjectRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const [activeField, setActiveField] = useState<"subject" | "body">("body");

  const [form, setForm] = useState({
    name: initial?.name ?? "",
    category: initial?.category ?? "dev_letter",
    language: initial?.language ?? "en",
    subject: initial?.subject ?? "",
    body: initial?.body ?? "",
    isShared: initial?.isShared ?? true,
  });

  function insertVar(key: string) {
    const placeholder = `{{${key}}}`;
    if (activeField === "subject") {
      const el = subjectRef.current;
      if (!el) {
        setForm((f) => ({ ...f, subject: f.subject + placeholder }));
        return;
      }
      const start = el.selectionStart ?? form.subject.length;
      const end = el.selectionEnd ?? form.subject.length;
      const next = form.subject.slice(0, start) + placeholder + form.subject.slice(end);
      setForm((f) => ({ ...f, subject: next }));
      requestAnimationFrame(() => {
        el.focus();
        const pos = start + placeholder.length;
        el.setSelectionRange(pos, pos);
      });
    } else {
      const el = bodyRef.current;
      if (!el) {
        setForm((f) => ({ ...f, body: f.body + placeholder }));
        return;
      }
      const start = el.selectionStart ?? form.body.length;
      const end = el.selectionEnd ?? form.body.length;
      const next = form.body.slice(0, start) + placeholder + form.body.slice(end);
      setForm((f) => ({ ...f, body: next }));
      requestAnimationFrame(() => {
        el.focus();
        const pos = start + placeholder.length;
        el.setSelectionRange(pos, pos);
      });
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const url = templateId
        ? `/api/export/templates/${templateId}`
        : "/api/export/templates";
      const method = templateId ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await parseResponseJson<{ error?: string }>(res);
      if (!res.ok) throw new Error(json.error ?? "保存失败");
      if (onSuccess) onSuccess();
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="sm:col-span-3">
          <label className="mb-1 block text-sm font-medium text-slate-700">模板名称 *</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            required
            placeholder="如：首封开发信 - 工厂自荐 EN"
            className="w-full rounded-md border border-slate-300 px-3 py-2"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">分类 *</label>
          <select
            value={form.category}
            onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
            className="w-full rounded-md border border-slate-300 px-3 py-2"
          >
            {EMAIL_TEMPLATE_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {emailTemplateCategoryLabel[c] ?? c}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">语言 *</label>
          <select
            value={form.language}
            onChange={(e) => setForm((f) => ({ ...f, language: e.target.value }))}
            className="w-full rounded-md border border-slate-300 px-3 py-2"
          >
            {EMAIL_TEMPLATE_LANGUAGES.map((l) => (
              <option key={l} value={l}>
                {emailTemplateLanguageLabel[l] ?? l}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-end">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={form.isShared}
              onChange={(e) => setForm((f) => ({ ...f, isShared: e.target.checked }))}
              className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
            />
            团队共享
          </label>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">主题 *</label>
        <input
          ref={subjectRef}
          type="text"
          value={form.subject}
          onFocus={() => setActiveField("subject")}
          onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
          required
          placeholder="支持变量，如：Inquiry from {{user.name}} - Steel Grating Supplier"
          className="w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-sm"
        />
      </div>

      <div>
        <div className="mb-1 flex items-center justify-between">
          <label className="block text-sm font-medium text-slate-700">正文 *</label>
          <span className="text-xs text-slate-400">
            支持变量 {`{{customer.companyName}}`} 等，点击右侧标签插入
          </span>
        </div>
        <div className="grid gap-3 lg:grid-cols-[1fr,200px]">
          <textarea
            ref={bodyRef}
            value={form.body}
            onFocus={() => setActiveField("body")}
            onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
            required
            rows={14}
            placeholder="Dear {{contact.name}},&#10;&#10;..."
            className="w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-sm"
          />
          <div className="rounded-md border border-slate-200 bg-slate-50 p-2">
            <p className="mb-2 text-xs font-medium text-slate-600">插入变量</p>
            <div className="max-h-80 overflow-y-auto space-y-1">
              {AVAILABLE_TEMPLATE_VARS.map((v) => (
                <button
                  key={v.key}
                  type="button"
                  onClick={() => insertVar(v.key)}
                  className="block w-full rounded px-2 py-1 text-left text-xs text-slate-700 hover:bg-white hover:text-teal-700"
                  title={v.description}
                >
                  <code className="text-[11px]">{`{{${v.key}}}`}</code>
                </button>
              ))}
            </div>
          </div>
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
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50"
          >
            取消
          </button>
        )}
      </div>
    </form>
  );
}
