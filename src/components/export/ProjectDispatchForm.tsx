"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  INTERESTED_PRODUCTS,
  PROJECT_INDUSTRIES,
  PROJECT_PARTY_ROLE_CHOICES,
  PROJECT_PARTY_ROLE_CHOICE_TEXT,
  PROJECT_STAGES,
} from "@/lib/export-constants";
import {
  interestedProductLabel,
  projectIndustryLabel,
  projectPartyRoleLabel,
  projectStageLabel,
} from "@/lib/export-display-labels";
import { canonicalizeCountry } from "@/lib/export/countries";
import { extractLeadManagerProjectNumber } from "@/lib/export/project-dispatch";
import { parseResponseJson } from "@/lib/parse-response-json";
import { CountrySelect } from "./CountrySelect";
import { useExportMe } from "./use-export-me";

interface ExportUser {
  id: string;
  name: string;
  email: string;
  roleLabel?: string;
}

interface ExistingProject {
  id: string;
  name: string;
}

const inputClass = "w-full rounded-md border border-slate-300 px-3 py-2";

/** 公司、联系人、电话、邮箱都可以空。全空就不建参与方，也不补占位公司名。 */
function contactOrNull(role: string, company: string, contact: string, phone: string, email: string) {
  const companyName = company.trim();
  const contactName = contact.trim();
  const phoneValue = phone.trim();
  const emailValue = email.trim();
  if (!companyName && !contactName && !phoneValue && !emailValue) return null;
  return {
    role,
    companyName: companyName || null,
    contactName: contactName || null,
    phone: phoneValue || null,
    email: emailValue || null,
  };
}

export function ProjectDispatchForm() {
  const router = useRouter();
  const me = useExportMe();
  const canAssign = Boolean(me?.canAssign);
  const [users, setUsers] = useState<ExportUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showMore, setShowMore] = useState(false);
  const [recognized, setRecognized] = useState("");
  const [duplicate, setDuplicate] = useState<ExistingProject | null>(null);
  const [form, setForm] = useState({
    tenderUrl: "",
    name: "",
    country: "",
    stage: "unknown",
    companyName: "",
    partyRole: "general_contractor",
    contactName: "",
    phone: "",
    email: "",
    askForRole: "",
    knownScope: "",
    needToVerify: "",
    ownerId: "",
    nextStep: "",
    feedbackDueAt: "",
    city: "",
    location: "",
    projectValue: "",
    industry: "",
    ownerOperator: "",
    generalContractor: "",
    potentialBuyers: "",
    selectedProducts: [] as string[],
    productNeedExtra: "",
    description: "",
    notes: "",
    extraCompany: "",
    extraRole: "subcontractor",
    extraContact: "",
    extraPhone: "",
    extraEmail: "",
  });

  useEffect(() => {
    if (me && !canAssign) router.replace("/export/projects");
  }, [me, canAssign, router]);

  useEffect(() => {
    if (!canAssign) return;
    (async () => {
      try {
        const r = await fetch("/api/export/users?assignable=1");
        const j = await parseResponseJson<{ data?: ExportUser[] }>(r);
        if (j.data) setUsers(j.data);
      } catch {
        /* ignore */
      }
    })();
  }, [canAssign]);

  useEffect(() => {
    const number = extractLeadManagerProjectNumber(form.tenderUrl);
    setRecognized(number ?? "");
    if (!number) {
      setDuplicate(null);
      return;
    }
    const timer = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/export/projects/lookup?number=${encodeURIComponent(number)}`);
        const json = await parseResponseJson<{ data?: ExistingProject | null }>(res);
        setDuplicate(res.ok ? json.data ?? null : null);
      } catch {
        setDuplicate(null);
      }
    }, 300);
    return () => window.clearTimeout(timer);
  }, [form.tenderUrl]);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function save(mode: "draft" | "assign") {
    setError("");
    if (duplicate) {
      setError("这个 LeadManager 项目已经录过，请打开原项目更新");
      return;
    }
    if (!form.name.trim()) {
      setError("请填写项目名称");
      return;
    }
    if (mode === "assign" && !form.ownerId) {
      setError("分配前请选择业务员");
      return;
    }
    if (mode === "assign" && !form.nextStep.trim()) {
      setError("分配前请写明业务员要问什么");
      return;
    }

    setLoading(true);
    try {
      const productNeed =
        [...form.selectedProducts, ...form.productNeedExtra.split(/[,，]/).map((item) => item.trim())]
          .filter(Boolean)
          .join(", ") || null;
      const notes = [form.projectValue.trim() ? `项目金额：${form.projectValue.trim()}` : "", form.notes.trim()]
        .filter(Boolean)
        .join("\n");
      const number = extractLeadManagerProjectNumber(form.tenderUrl);
      const res = await fetch("/api/export/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dispatch: mode,
          name: form.name.trim(),
          country: canonicalizeCountry(form.country) || form.country.trim() || null,
          stage: form.stage,
          tenderUrl: form.tenderUrl.trim() || null,
          sourceProjectNumber: number,
          source: number ? "LeadManager" : null,
          askForRole: form.askForRole.trim() || null,
          knownScope: form.knownScope.trim() || null,
          needToVerify: form.needToVerify.trim() || null,
          nextStep: form.nextStep.trim() || null,
          feedbackDueAt: form.feedbackDueAt || null,
          ownerId: mode === "assign" ? form.ownerId : null,
          city: form.city.trim() || null,
          location: form.location.trim() || null,
          industry: form.industry || null,
          ownerOperator: form.ownerOperator.trim() || null,
          generalContractor: form.generalContractor.trim() || null,
          potentialBuyers: form.potentialBuyers.trim() || null,
          productNeed,
          description: form.description.trim() || null,
          notes: notes || null,
          firstContact: contactOrNull(form.partyRole, form.companyName, form.contactName, form.phone, form.email),
          extraParties: [
            contactOrNull(form.extraRole, form.extraCompany, form.extraContact, form.extraPhone, form.extraEmail),
          ].filter((party) => party !== null),
        }),
      });
      const json = await parseResponseJson<{
        error?: string;
        data?: { id: string };
        existing?: ExistingProject;
      }>(res);
      if (!res.ok) {
        if (json.existing) setDuplicate(json.existing);
        throw new Error(json.error ?? "保存失败");
      }
      if (json.data?.id) router.push(`/export/projects/${json.data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void save("draft");
      }}
      className="export-card export-detail-group max-w-3xl space-y-6 p-7"
    >
        <p className="text-sm text-slate-500">
        贴上 LeadManager 项目，写清第一通打给谁、要问什么，再分配。草稿不分配，业务员看不到。选了业务员也要点「保存并分配」才会派出去。
      </p>
      {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}
      {duplicate && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          LM {recognized || extractLeadManagerProjectNumber(form.tenderUrl)} 已经录过：
          <Link href={`/export/projects/${duplicate.id}`} className="mx-1 font-medium underline">
            {duplicate.name}
          </Link>
          。请去原项目更新，不要再建一条。
        </div>
      )}

      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-slate-800">1. 项目来源</h2>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">LeadManager 链接</label>
          <input
            type="text"
            value={form.tenderUrl}
            onChange={(event) => set("tenderUrl", event.target.value)}
            placeholder="粘贴项目链接，或直接填 LM 137094003"
            className={inputClass}
          />
          <p className="mt-1 text-xs text-slate-500">
            {recognized
              ? `识别到 LM ${recognized}。链接后面的版本参数变了，也按这个号查重。`
              : "例如 Kuala Kubu Bharu 水厂改造是 LM 137094003。没识别出号也可以先保存。"}
          </p>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">项目名称 *</label>
          <input
            type="text"
            value={form.name}
            onChange={(event) => set("name", event.target.value)}
            required
            placeholder="Kuala Kubu Bharu 水厂改造"
            className={inputClass}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">国家</label>
            <CountrySelect
              value={form.country}
              allowCustom
              emptyLabel="请选择国家"
              onChange={(country) => set("country", country)}
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">阶段</label>
            <select value={form.stage} onChange={(event) => set("stage", event.target.value)} className={inputClass}>
              {PROJECT_STAGES.map((stage) => (
                <option key={stage} value={stage}>
                  {projectStageLabel[stage] ?? stage}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-slate-800">2. 第一通找谁</h2>
        <p className="text-xs text-slate-500">只有总机时，联系人可以空着，写清要转的岗位。</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">公司</label>
            <input
              type="text"
              value={form.companyName}
              onChange={(event) => set("companyName", event.target.value)}
              placeholder={`例如${PROJECT_PARTY_ROLE_CHOICE_TEXT}里的公司`}
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">项目角色</label>
            <select
              value={form.partyRole}
              onChange={(event) => set("partyRole", event.target.value)}
              className={inputClass}
            >
              {PROJECT_PARTY_ROLE_CHOICES.map((role) => (
                <option key={role} value={role}>
                  {projectPartyRoleLabel[role] ?? role}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-slate-500">{PROJECT_PARTY_ROLE_CHOICE_TEXT}</p>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">联系人</label>
            <input
              type="text"
              value={form.contactName}
              onChange={(event) => set("contactName", event.target.value)}
              placeholder="只有总机可以不填"
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">电话或邮箱</label>
            <input
              type="text"
              value={form.phone}
              onChange={(event) => set("phone", event.target.value)}
              placeholder="+60 3 6141 7311"
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">邮箱</label>
            <input
              type="text"
              value={form.email}
              onChange={(event) => set("email", event.target.value)}
              placeholder="没有电话时填邮箱"
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">请转哪个岗位</label>
            <input
              type="text"
              value={form.askForRole}
              onChange={(event) => set("askForRole", event.target.value)}
              placeholder="负责脱水车间设备平台的项目经理或采购"
              className={inputClass}
            />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-slate-800">3. 为什么值得跟</h2>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">已知范围</label>
          <input
            type="text"
            value={form.knownScope}
            onChange={(event) => set("knownScope", event.target.value)}
            placeholder="已知有新增脱水建筑和设备"
            className={inputClass}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">还要核实</label>
          <input
            type="text"
            value={form.needToVerify}
            onChange={(event) => set("needToVerify", event.target.value)}
            placeholder="平台和走道是否使用钢格板待核实"
            className={inputClass}
          />
        </div>
        <p className="text-xs text-slate-500">需求先记成「需求待核实」，业务员联系后再改。</p>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-slate-800">4. 派发任务</h2>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">分配给</label>
          <select value={form.ownerId} onChange={(event) => set("ownerId", event.target.value)} className={inputClass}>
            <option value="">暂不分配</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.roleLabel ? `${user.name}（${user.roleLabel}）` : user.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">业务员要问什么</label>
          <textarea
            value={form.nextStep}
            onChange={(event) => set("nextStep", event.target.value)}
            rows={3}
            placeholder="确认是否用钢格板、是否已下单。如果归分包，拿到分包公司名和采购联系人"
            className={inputClass}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">希望反馈日期</label>
          <input
            type="date"
            value={form.feedbackDueAt}
            onChange={(event) => set("feedbackDueAt", event.target.value)}
            className={inputClass}
          />
        </div>
      </section>

      <section className="rounded-xl border border-stone-200">
        <button
          type="button"
          onClick={() => setShowMore((open) => !open)}
          className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium text-slate-700"
        >
          更多信息
          <span className="text-xs text-slate-500">{showMore ? "收起" : "项目金额、详细地址、其他参与方"}</span>
        </button>
        {showMore && (
          <div className="space-y-4 border-t border-stone-200 px-4 py-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">项目金额</label>
                <input
                  type="text"
                  value={form.projectValue}
                  onChange={(event) => set("projectValue", event.target.value)}
                  placeholder="例如 MYR 48 million"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">城市</label>
                <input
                  type="text"
                  value={form.city}
                  onChange={(event) => set("city", event.target.value)}
                  className={inputClass}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium text-slate-700">详细地址</label>
                <input
                  type="text"
                  value={form.location}
                  onChange={(event) => set("location", event.target.value)}
                  placeholder="城市 / 州"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">行业</label>
                <select
                  value={form.industry}
                  onChange={(event) => set("industry", event.target.value)}
                  className={inputClass}
                >
                  <option value="">未选</option>
                  {PROJECT_INDUSTRIES.map((industry) => (
                    <option key={industry} value={industry}>
                      {projectIndustryLabel[industry] ?? industry}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">业主/运营商</label>
                <input
                  type="text"
                  value={form.ownerOperator}
                  onChange={(event) => set("ownerOperator", event.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">总包</label>
                <input
                  type="text"
                  value={form.generalContractor}
                  onChange={(event) => set("generalContractor", event.target.value)}
                  placeholder="第一通角色是总包且这里空着时，用那家公司"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">潜在采购公司</label>
                <input
                  type="text"
                  value={form.potentialBuyers}
                  onChange={(event) => set("potentialBuyers", event.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">可能用到的产品</label>
              <div className="mb-2 flex flex-wrap gap-2">
                {INTERESTED_PRODUCTS.map((product) => (
                  <label key={product} className="flex items-center gap-1.5 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={form.selectedProducts.includes(product)}
                      onChange={(event) => {
                        set(
                          "selectedProducts",
                          event.target.checked
                            ? [...form.selectedProducts, product]
                            : form.selectedProducts.filter((item) => item !== product),
                        );
                      }}
                      className="rounded border-slate-300"
                    />
                    {interestedProductLabel[product] ?? product}
                  </label>
                ))}
              </div>
              <textarea
                value={form.productNeedExtra}
                onChange={(event) => set("productNeedExtra", event.target.value)}
                rows={2}
                placeholder="规格、用量（可选）"
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">项目说明</label>
              <textarea
                value={form.description}
                onChange={(event) => set("description", event.target.value)}
                rows={2}
                className={inputClass}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2 text-xs font-semibold text-stone-500">其他参与方</div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">公司</label>
                <input
                  type="text"
                  value={form.extraCompany}
                  onChange={(event) => set("extraCompany", event.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">角色</label>
                <select
                  value={form.extraRole}
                  onChange={(event) => set("extraRole", event.target.value)}
                  className={inputClass}
                >
                  {PROJECT_PARTY_ROLE_CHOICES.map((role) => (
                    <option key={role} value={role}>
                      {projectPartyRoleLabel[role] ?? role}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-slate-500">{PROJECT_PARTY_ROLE_CHOICE_TEXT}</p>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">联系人</label>
                <input
                  type="text"
                  value={form.extraContact}
                  onChange={(event) => set("extraContact", event.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">电话或邮箱</label>
                <input
                  type="text"
                  value={form.extraPhone}
                  onChange={(event) => set("extraPhone", event.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">备注</label>
              <textarea
                value={form.notes}
                onChange={(event) => set("notes", event.target.value)}
                rows={2}
                className={inputClass}
              />
            </div>
          </div>
        )}
      </section>

      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={loading || Boolean(duplicate)}
          className="export-btn-secondary rounded-md px-4 py-2 text-sm disabled:opacity-50"
        >
          {loading ? "保存中..." : "保存草稿"}
        </button>
        <button
          type="button"
          disabled={loading || Boolean(duplicate)}
          onClick={() => void save("assign")}
          className="export-btn-primary rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          保存并分配
        </button>
        <Link href="/export/projects" className="export-btn-secondary rounded-md px-4 py-2 text-sm">
          取消
        </Link>
      </div>
    </form>
  );
}
