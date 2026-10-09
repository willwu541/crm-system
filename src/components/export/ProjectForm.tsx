"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { INTERESTED_PRODUCTS, PROJECT_CONFIDENCE, PROJECT_INDUSTRIES, PROJECT_STAGES, PROJECT_STATUSES } from "@/lib/export-constants";
import {
  interestedProductLabel,
  projectConfidenceLabel,
  projectIndustryLabel,
  projectStageLabel,
  projectStatusLabel,
} from "@/lib/export-display-labels";
import { parseResponseJson } from "@/lib/parse-response-json";
import { canonicalizeCountry } from "@/lib/export/countries";
import { CountrySelect } from "./CountrySelect";

interface ExportUser {
  id: string;
  name: string;
  email: string;
}

function dateInputValue(value: unknown): string {
  if (!value || typeof value !== "string") return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value.slice(0, 10);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function splitProducts(raw: string) {
  const parts = raw.split(/[,，]/).map((s) => s.trim()).filter(Boolean);
  const selected = INTERESTED_PRODUCTS.filter((p) => parts.includes(p)) as string[];
  const extra = parts.filter((p) => !selected.includes(p)).join("，");
  return { selected, extra };
}

export function ProjectForm({
  projectId,
  initial,
  onSuccess,
  onCancel,
}: {
  projectId?: string;
  initial?: Record<string, unknown>;
  onSuccess?: () => void;
  onCancel?: () => void;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [users, setUsers] = useState<ExportUser[]>([]);
  const initialNeed = (initial?.productNeed as string) ?? "";
  const initialProducts = splitProducts(initialNeed);

  const [form, setForm] = useState({
    name: (initial?.name as string) ?? "",
    country: (initial?.country as string) ?? "",
    city: (initial?.city as string) ?? "",
    location: (initial?.location as string) ?? "",
    industry: (initial?.industry as string) ?? "",
    stage: (initial?.stage as string) ?? "unknown",
    confidence: (initial?.confidence as string) ?? "unknown",
    ownerOperator: (initial?.ownerOperator as string) ?? "",
    generalContractor: (initial?.generalContractor as string) ?? "",
    potentialBuyers: (initial?.potentialBuyers as string) ?? "",
    selectedProducts: initialProducts.selected,
    productNeedExtra: initialProducts.extra,
    description: (initial?.description as string) ?? "",
    source: (initial?.source as string) ?? "",
    tenderUrl: (initial?.tenderUrl as string) ?? "",
    status: (initial?.status as string) ?? "hunting",
    bidDeadline: dateInputValue(initial?.bidDeadline),
    ownerId: (initial?.owner as { id?: string })?.id ?? (initial?.ownerId as string) ?? "",
    notes: (initial?.notes as string) ?? "",
    entryStatus: (initial?.entryStatus as string) ?? "entered",
  });

  useEffect(() => {
    if (initial?.owner && typeof initial.owner === "object" && "id" in (initial.owner as object)) {
      setForm((f) => ({ ...f, ownerId: String((initial.owner as { id: string }).id) }));
    }
  }, [initial]);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/export/users");
        const j = await parseResponseJson<{ data?: ExportUser[] }>(r);
        if (j.data) setUsers(j.data);
      } catch {
        /* ignore */
      }
    })();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const productNeed =
        [...form.selectedProducts, ...form.productNeedExtra.split(/[,，]/).map((s) => s.trim())]
          .filter(Boolean)
          .join(", ") || null;
      const body = {
        name: form.name.trim(),
        country: canonicalizeCountry(form.country) || form.country.trim() || null,
        city: form.city.trim() || null,
        location: form.location.trim() || null,
        industry: form.industry || null,
        stage: form.stage,
        confidence: form.confidence,
        ownerOperator: form.ownerOperator.trim() || null,
        generalContractor: form.generalContractor.trim() || null,
        potentialBuyers: form.potentialBuyers.trim() || null,
        productNeed,
        description: form.description.trim() || null,
        source: form.source.trim() || null,
        tenderUrl: form.tenderUrl.trim() || null,
        status: form.status,
        bidDeadline: form.bidDeadline || null,
        ownerId: form.ownerId || null,
        notes: form.notes.trim() || null,
        entryStatus: form.entryStatus,
      };
      const url = projectId ? `/api/export/projects/${projectId}` : "/api/export/projects";
      const res = await fetch(url, {
        method: projectId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await parseResponseJson<{ error?: string; data?: { id: string } }>(res);
      if (!res.ok) throw new Error(json.error ?? "保存失败");
      if (onSuccess) {
        onSuccess();
        return;
      }
      if (projectId) {
        router.refresh();
        return;
      }
      if (json.data?.id) router.push(`/export/projects/${json.data.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="export-card export-detail-group max-w-3xl space-y-5 p-7">
      {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}
      <p className="text-sm text-slate-500">
        先填项目情报（行业、阶段、业主、总包），保存后再让业务员去找联系方式。团队全员可见。
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2 text-xs font-semibold uppercase tracking-wide text-stone-500">
          项目情报
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-sm font-medium text-slate-700">项目名称 *</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            required
            placeholder="例如：AirTrunk Sedenak Tech Park Data Center"
            className="w-full rounded-md border border-slate-300 px-3 py-2"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-sm font-medium text-slate-700">录入状态</label>
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["pending", "未录入"],
                ["entered", "已录入"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setForm((f) => ({ ...f, entryStatus: value }))}
                className={`rounded-full border px-3 py-1 text-sm ${
                  form.entryStatus === value
                    ? value === "entered"
                      ? "border-emerald-600 bg-emerald-600 text-white"
                      : "border-amber-600 bg-amber-600 text-white"
                    : "border-slate-300 bg-white text-slate-700"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="mt-1 text-xs text-slate-500">录完标已录入，之后在列表「已录入」里找；还没填完的放未录入。</p>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">国家</label>
          <CountrySelect
            value={form.country}
            allowCustom
            emptyLabel="请选择国家"
            onChange={(country) => setForm((f) => ({ ...f, country }))}
            className="w-full rounded-md border border-slate-300 px-3 py-2"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">城市</label>
          <input
            type="text"
            value={form.city}
            onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
            className="w-full rounded-md border border-slate-300 px-3 py-2"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-sm font-medium text-slate-700">项目地点</label>
          <input
            type="text"
            value={form.location}
            onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
            placeholder="城市 / 州，如 Sedenak, Johor"
            className="w-full rounded-md border border-slate-300 px-3 py-2"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">行业</label>
          <select
            value={form.industry}
            onChange={(e) => setForm((f) => ({ ...f, industry: e.target.value }))}
            className="w-full rounded-md border border-slate-300 px-3 py-2"
          >
            <option value="">未选</option>
            {PROJECT_INDUSTRIES.map((s) => (
              <option key={s} value={s}>
                {projectIndustryLabel[s] ?? s}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">阶段</label>
          <select
            value={form.stage}
            onChange={(e) => setForm((f) => ({ ...f, stage: e.target.value }))}
            className="w-full rounded-md border border-slate-300 px-3 py-2"
          >
            {PROJECT_STAGES.map((s) => (
              <option key={s} value={s}>
                {projectStageLabel[s] ?? s}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">可靠度</label>
          <select
            value={form.confidence}
            onChange={(e) => setForm((f) => ({ ...f, confidence: e.target.value }))}
            className="w-full rounded-md border border-slate-300 px-3 py-2"
          >
            {PROJECT_CONFIDENCE.map((s) => (
              <option key={s} value={s}>
                {projectConfidenceLabel[s] ?? s}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">跟进状态</label>
          <select
            value={form.status}
            onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
            className="w-full rounded-md border border-slate-300 px-3 py-2"
          >
            {PROJECT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {projectStatusLabel[s] ?? s}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">业主/运营商</label>
          <input
            type="text"
            value={form.ownerOperator}
            onChange={(e) => setForm((f) => ({ ...f, ownerOperator: e.target.value }))}
            placeholder="AirTrunk"
            className="w-full rounded-md border border-slate-300 px-3 py-2"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">总包</label>
          <input
            type="text"
            value={form.generalContractor}
            onChange={(e) => setForm((f) => ({ ...f, generalContractor: e.target.value }))}
            placeholder="Gamuda Engineering"
            className="w-full rounded-md border border-slate-300 px-3 py-2"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-sm font-medium text-slate-700">潜在采购公司</label>
          <input
            type="text"
            value={form.potentialBuyers}
            onChange={(e) => setForm((f) => ({ ...f, potentialBuyers: e.target.value }))}
            placeholder="EPC / 分包 / 钢构厂，多个用顿号分开"
            className="w-full rounded-md border border-slate-300 px-3 py-2"
          />
        </div>
        <div className="sm:col-span-2 pt-2 text-xs font-semibold uppercase tracking-wide text-stone-500">
          找人跟进
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">投标/跟进截止</label>
          <input
            type="date"
            value={form.bidDeadline}
            onChange={(e) => setForm((f) => ({ ...f, bidDeadline: e.target.value }))}
            className="w-full rounded-md border border-slate-300 px-3 py-2"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-sm font-medium text-slate-700">跟进业务员</label>
          <select
            value={form.ownerId}
            onChange={(e) => setForm((f) => ({ ...f, ownerId: e.target.value }))}
            className="w-full rounded-md border border-slate-300 px-3 py-2"
          >
            <option value="">暂不指定（大家一起找）</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} ({u.email})
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-sm font-medium text-slate-700">可能用到的产品</label>
          <div className="mb-2 flex flex-wrap gap-2">
            {INTERESTED_PRODUCTS.map((p) => (
              <label key={p} className="flex items-center gap-1.5 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={form.selectedProducts.includes(p)}
                  onChange={(e) => {
                    setForm((f) => ({
                      ...f,
                      selectedProducts: e.target.checked
                        ? [...f.selectedProducts, p]
                        : f.selectedProducts.filter((x) => x !== p),
                    }));
                  }}
                  className="rounded border-slate-300"
                />
                {interestedProductLabel[p] ?? p}
              </label>
            ))}
          </div>
          <textarea
            value={form.productNeedExtra}
            onChange={(e) => setForm((f) => ({ ...f, productNeedExtra: e.target.value }))}
            rows={2}
            placeholder="规格、用量、其他需求（可选）"
            className="w-full rounded-md border border-slate-300 px-3 py-2"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">听说渠道</label>
          <input
            type="text"
            value={form.source}
            onChange={(e) => setForm((f) => ({ ...f, source: e.target.value }))}
            placeholder="招标网、客户提到、新闻标题…"
            className="w-full rounded-md border border-slate-300 px-3 py-2"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">招标/项目链接</label>
          <input
            type="url"
            value={form.tenderUrl}
            onChange={(e) => setForm((f) => ({ ...f, tenderUrl: e.target.value }))}
            placeholder="https://"
            className="w-full rounded-md border border-slate-300 px-3 py-2"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-sm font-medium text-slate-700">项目说明</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            rows={3}
            placeholder="已知信息：业主、规模、进度、找谁最有用…"
            className="w-full rounded-md border border-slate-300 px-3 py-2"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-sm font-medium text-slate-700">备注</label>
          <textarea
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            rows={2}
            className="w-full rounded-md border border-slate-300 px-3 py-2"
          />
        </div>
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
            href={projectId ? `/export/projects/${projectId}` : "/export/projects"}
            className="export-btn-secondary rounded-md px-4 py-2 text-sm"
          >
            取消
          </Link>
        )}
      </div>
    </form>
  );
}
