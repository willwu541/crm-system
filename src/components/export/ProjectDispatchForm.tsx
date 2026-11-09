"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  INTERESTED_PRODUCTS,
  PROJECT_INDUSTRIES,
  PARTY_ROLE_STATUSES,
  PROJECT_PARTY_ROLE_CHOICES,
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

type PersonDraft = {
  contactName: string;
  contactTitle: string;
  phone: string;
  email: string;
};

type RoleDraft = {
  status: string;
  companyName: string;
  website: string;
  note: string;
  people: PersonDraft[];
};

function emptyPerson(): PersonDraft {
  return { contactName: "", contactTitle: "", phone: "", email: "" };
}

function emptyRole(): RoleDraft {
  return { status: "", companyName: "", website: "", note: "", people: [emptyPerson()] };
}

function emptyContacts(): Record<(typeof PROJECT_PARTY_ROLE_CHOICES)[number], RoleDraft> {
  return {
    owner: emptyRole(),
    epc: emptyRole(),
    general_contractor: emptyRole(),
    subcontractor: emptyRole(),
    consultant: emptyRole(),
    designer: emptyRole(),
    procurement: emptyRole(),
  };
}

/** 同一环节可以有多位联系人。整段都空就不建记录。 */
function partiesFromRole(role: string, row: RoleDraft) {
  const status = row.status.trim();
  const companyName = row.companyName.trim();
  const website = row.website.trim();
  const note = row.note.trim();
  const people = row.people
    .map((person) => ({
      contactName: person.contactName.trim(),
      contactTitle: person.contactTitle.trim(),
      phone: person.phone.trim(),
      email: person.email.trim(),
    }))
    .filter((person) => person.contactName || person.contactTitle || person.phone || person.email);
  if (!status && !companyName && !website && !note && people.length === 0) return [];
  const rows = people.length > 0 ? people : [{ contactName: "", contactTitle: "", phone: "", email: "" }];
  return rows.map((person) => ({
    role,
    roleStatus: status || null,
    companyName: companyName || null,
    website: website || null,
    notes: note || null,
    contactName: person.contactName || null,
    contactTitle: person.contactTitle || null,
    phone: person.phone || null,
    email: person.email || null,
  }));
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
    scheduleStatus: "",
    scheduleStart: "",
    scheduleEnd: "",
    tenderOpening: "",
    tenderDeadline: "",
    contractorState: "",
    appointmentMethod: "",
    contacts: emptyContacts(),
    ownerId: "",
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

  function setRole(
    role: (typeof PROJECT_PARTY_ROLE_CHOICES)[number],
    key: "status" | "companyName" | "website" | "note",
    value: string,
  ) {
    setForm((current) => ({
      ...current,
      contacts: {
        ...current.contacts,
        [role]: { ...current.contacts[role], [key]: value },
      },
    }));
  }

  function setPerson(
    role: (typeof PROJECT_PARTY_ROLE_CHOICES)[number],
    index: number,
    key: keyof PersonDraft,
    value: string,
  ) {
    setForm((current) => ({
      ...current,
      contacts: {
        ...current.contacts,
        [role]: {
          ...current.contacts[role],
          people: current.contacts[role].people.map((person, personIndex) =>
            personIndex === index ? { ...person, [key]: value } : person,
          ),
        },
      },
    }));
  }

  function addPerson(role: (typeof PROJECT_PARTY_ROLE_CHOICES)[number]) {
    setForm((current) => ({
      ...current,
      contacts: {
        ...current.contacts,
        [role]: { ...current.contacts[role], people: [...current.contacts[role].people, emptyPerson()] },
      },
    }));
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
          scheduleStatus: form.scheduleStatus.trim() || null,
          scheduleStart: form.scheduleStart.trim() || null,
          scheduleEnd: form.scheduleEnd.trim() || null,
          tenderOpening: form.tenderOpening.trim() || null,
          tenderDeadline: form.tenderDeadline.trim() || null,
          contractorState: form.contractorState.trim() || null,
          appointmentMethod: form.appointmentMethod.trim() || null,
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
          extraParties: PROJECT_PARTY_ROLE_CHOICES.flatMap((role) => partiesFromRole(role, form.contacts[role])),
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
        先填项目和时间，再按环节记公司和联系人。一个环节可以有多位联系人。没委任、还在招标，选状态即可，其余留空。草稿不分配，业务员看不到。
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
        <h2 className="text-sm font-semibold text-slate-800">1. 项目信息</h2>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">LeadManager 链接</label>
          <input
            type="text"
            value={form.tenderUrl}
            onChange={(event) => set("tenderUrl", event.target.value)}
            placeholder="粘贴项目链接，或直接填项目号"
            className={inputClass}
          />
          <p className="mt-1 text-xs text-slate-500">
            {recognized
              ? `识别到 LM ${recognized}。链接后面的版本参数变了，也按这个号查重。`
              : "没识别出项目号也可以先保存。"}
          </p>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">项目名称 *</label>
          <input
            type="text"
            value={form.name}
            onChange={(event) => set("name", event.target.value)}
            placeholder="项目名称"
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
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">项目状态</label>
            <input
              type="text"
              value={form.scheduleStatus}
              onChange={(event) => set("scheduleStatus", event.target.value)}
              placeholder="如：招标已结束，投标名单已列出"
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">项目金额</label>
            <input
              type="text"
              value={form.projectValue}
              onChange={(event) => set("projectValue", event.target.value)}
              placeholder="按资料原文，没有就留空"
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
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">地点</label>
            <input
              type="text"
              value={form.location}
              onChange={(event) => set("location", event.target.value)}
              placeholder="镇、区、街道"
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
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-slate-800">2. 时间与招标</h2>
        <p className="text-xs text-slate-500">按资料原文填写。没有的留空。</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">施工开始</label>
            <input
              type="text"
              value={form.scheduleStart}
              onChange={(event) => set("scheduleStart", event.target.value)}
              placeholder="2027年1月"
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">施工结束</label>
            <input
              type="text"
              value={form.scheduleEnd}
              onChange={(event) => set("scheduleEnd", event.target.value)}
              placeholder="2029年1月"
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">开标</label>
            <input
              type="text"
              value={form.tenderOpening}
              onChange={(event) => set("tenderOpening", event.target.value)}
              placeholder="没有就留空"
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">投标截止</label>
            <input
              type="text"
              value={form.tenderDeadline}
              onChange={(event) => set("tenderDeadline", event.target.value)}
              placeholder="没有就留空"
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">总包是否已委任</label>
            <select
              value={form.contractorState}
              onChange={(event) => set("contractorState", event.target.value)}
              className={inputClass}
            >
              <option value="">未填</option>
              {PARTY_ROLE_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">委任方式</label>
            <input
              type="text"
              value={form.appointmentMethod}
              onChange={(event) => set("appointmentMethod", event.target.value)}
              placeholder="如：招标"
              className={inputClass}
            />
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-800">3. 各环节关键人</h2>
        <p className="text-xs text-slate-500">和资料页一样，一个环节一张卡。先选状态和公司，再写下面的人。没有就留空。</p>
        {PROJECT_PARTY_ROLE_CHOICES.map((role) => {
          const row = form.contacts[role];
          return (
            <div key={role} className="space-y-3 rounded-lg border border-slate-200 p-3">
              <p className="text-sm font-medium text-slate-800">{projectPartyRoleLabel[role] ?? role}</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <select
                  value={row.status}
                  onChange={(event) => setRole(role, "status", event.target.value)}
                  className={inputClass}
                >
                  <option value="">状态未填</option>
                  {PARTY_ROLE_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={row.companyName}
                  onChange={(event) => setRole(role, "companyName", event.target.value)}
                  placeholder="公司"
                  className={inputClass}
                />
                <input
                  type="text"
                  value={row.website}
                  onChange={(event) => setRole(role, "website", event.target.value)}
                  placeholder="网站"
                  className={inputClass}
                />
                <input
                  type="text"
                  value={row.note}
                  onChange={(event) => setRole(role, "note", event.target.value)}
                  placeholder="补充，如地址或投标额。没有就留空"
                  className={`${inputClass} sm:col-span-2`}
                />
              </div>
              {row.people.map((person, index) => (
                <div key={index} className="grid gap-3 border-t border-slate-100 pt-3 sm:grid-cols-2">
                  <input
                    type="text"
                    value={person.contactName}
                    onChange={(event) => setPerson(role, index, "contactName", event.target.value)}
                    placeholder="联系人"
                    className={inputClass}
                  />
                  <input
                    type="text"
                    value={person.contactTitle}
                    onChange={(event) => setPerson(role, index, "contactTitle", event.target.value)}
                    placeholder="职位"
                    className={inputClass}
                  />
                  <input
                    type="text"
                    value={person.phone}
                    onChange={(event) => setPerson(role, index, "phone", event.target.value)}
                    placeholder="电话"
                    className={inputClass}
                  />
                  <input
                    type="text"
                    value={person.email}
                    onChange={(event) => setPerson(role, index, "email", event.target.value)}
                    placeholder="邮箱"
                    className={inputClass}
                  />
                </div>
              ))}
              <button
                type="button"
                onClick={() => addPerson(role)}
                className="text-sm text-slate-600 underline"
              >
                再加一位联系人
              </button>
            </div>
          );
        })}
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-slate-800">4. 分配</h2>
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
      </section>

      <section className="rounded-xl border border-stone-200">
        <button
          type="button"
          onClick={() => setShowMore((open) => !open)}
          className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium text-slate-700"
        >
          更多信息
          <span className="text-xs text-slate-500">{showMore ? "收起" : "工程范围、产品"}</span>
        </button>
        {showMore && (
          <div className="space-y-4 border-t border-stone-200 px-4 py-4">
            <div className="grid gap-4 sm:grid-cols-2">
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
                  placeholder="上面总包一行填了公司，这里可以不重复"
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
