"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/ui/Toast";
import { Drawer } from "./shared/Drawer";
import { TemplateForm } from "./TemplateForm";
import { ExportDeleteButton } from "./ExportDeleteButton";
import { parseResponseJson } from "@/lib/parse-response-json";
import {
  EMAIL_TEMPLATE_CATEGORIES,
  EMAIL_TEMPLATE_LANGUAGES,
} from "@/lib/export-constants";
import {
  emailTemplateCategoryLabel,
  emailTemplateLanguageLabel,
} from "@/lib/export-display-labels";

interface Template {
  id: string;
  name: string;
  category: string;
  language: string;
  subject: string;
  body: string;
  isShared: boolean;
  isBuiltin: boolean;
  createdBy: { id: string; name: string };
  updatedAt: string;
}

export function TemplatesClient() {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState("");
  const [language, setLanguage] = useState("");
  const [keyword, setKeyword] = useState("");
  const [drawer, setDrawer] = useState<"new" | "edit" | null>(null);
  const [editing, setEditing] = useState<Template | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  async function fetchTemplates(opts?: { silent?: boolean }) {
    if (!opts?.silent) setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (category) params.set("category", category);
      if (language) params.set("language", language);
      if (keyword) params.set("keyword", keyword);
      const r = await fetch(`/api/export/templates?${params}`);
      const json = await parseResponseJson<{ data?: Template[]; error?: string }>(r);
      if (!r.ok) throw new Error(json.error ?? "加载失败");
      setTemplates(json.data ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "加载失败");
    } finally {
      if (!opts?.silent) setLoading(false);
    }
  }

  useEffect(() => {
    fetchTemplates();
  }, [category, language]);

  function handleEdit(t: Template) {
    setEditing(t);
    setDrawer("edit");
  }

  function handleFormSuccess() {
    setDrawer(null);
    setEditing(null);
    toast("保存成功");
    fetchTemplates({ silent: true });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            fetchTemplates();
          }}
          className="flex flex-wrap gap-2"
        >
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="按名称/主题搜索"
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">全部分类</option>
            {EMAIL_TEMPLATE_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {emailTemplateCategoryLabel[c] ?? c}
              </option>
            ))}
          </select>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">全部语言</option>
            {EMAIL_TEMPLATE_LANGUAGES.map((l) => (
              <option key={l} value={l}>
                {emailTemplateLanguageLabel[l] ?? l}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="rounded-md bg-slate-700 px-4 py-2 text-sm text-white hover:bg-slate-800"
          >
            搜索
          </button>
        </form>
        <button
          type="button"
          onClick={() => setDrawer("new")}
          className="rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
        >
          新建模板
        </button>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>
      )}

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        {loading ? (
          <div className="p-12 text-center text-slate-500">加载中...</div>
        ) : templates.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            暂无模板
            <div className="mt-2">
              <button
                type="button"
                onClick={() => setDrawer("new")}
                className="text-sm text-teal-600 hover:underline"
              >
                新建第一个模板
              </button>
            </div>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {templates.map((t) => {
              const expanded = expandedId === t.id;
              return (
                <li key={t.id} className="px-4 py-3">
                  <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-slate-800">{t.name}</span>
                        <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                          {emailTemplateCategoryLabel[t.category] ?? t.category}
                        </span>
                        <span className="rounded bg-teal-50 px-2 py-0.5 text-xs text-teal-700">
                          {emailTemplateLanguageLabel[t.language] ?? t.language}
                        </span>
                        {t.isBuiltin && (
                          <span className="rounded bg-amber-50 px-2 py-0.5 text-xs text-amber-700">
                            内置
                          </span>
                        )}
                        {!t.isShared && (
                          <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                            私有
                          </span>
                        )}
                      </div>
                      <div className="mt-1 truncate text-sm text-slate-600">{t.subject}</div>
                      {expanded && (
                        <pre className="mt-2 max-h-72 overflow-y-auto whitespace-pre-wrap rounded bg-slate-50 p-3 font-mono text-xs text-slate-700">
                          {t.body}
                        </pre>
                      )}
                      <div className="mt-1 flex items-center gap-3 text-xs text-slate-400">
                        <span>by {t.createdBy.name}</span>
                        <span>更新 {new Date(t.updatedAt).toLocaleString("zh-CN")}</span>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setExpandedId(expanded ? null : t.id)}
                        className="text-xs text-teal-600 hover:underline"
                      >
                        {expanded ? "收起" : "查看正文"}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleEdit(t)}
                        className="text-xs text-teal-600 hover:underline"
                      >
                        编辑
                      </button>
                      {!t.isBuiltin && (
                        <ExportDeleteButton
                          apiPath={`/api/export/templates/${t.id}`}
                          onDeleted={() => fetchTemplates({ silent: true })}
                          label="删除"
                          className="text-xs text-red-600 hover:underline disabled:opacity-50"
                        />
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <Drawer
        open={drawer === "new"}
        onClose={() => setDrawer(null)}
        title="新建模板"
        width="xl"
      >
        <TemplateForm onSuccess={handleFormSuccess} onCancel={() => setDrawer(null)} />
      </Drawer>

      <Drawer
        open={drawer === "edit" && !!editing}
        onClose={() => {
          setDrawer(null);
          setEditing(null);
        }}
        title="编辑模板"
        width="xl"
      >
        {editing && (
          <TemplateForm
            templateId={editing.id}
            initial={editing}
            onSuccess={handleFormSuccess}
            onCancel={() => {
              setDrawer(null);
              setEditing(null);
            }}
          />
        )}
      </Drawer>
    </div>
  );
}
