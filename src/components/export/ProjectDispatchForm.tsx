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

/** 按 PDF 阅读顺序：业主 → 设计师 → 顾问 → 总包 → EPC → 分包 → 采购 */
const ROLE_FORM_ORDER = [
  "owner",
  "designer",
  "consultant",
  "general_contractor",
  "epc",
  "subcontractor",
  "procurement",
] as const satisfies ReadonlyArray<(typeof PROJECT_PARTY_ROLE_CHOICES)[number]>;

type PersonDraft = {
  contactName: string;
  contactTitle: string;
  phone: string;
  email: string;
};

type RoleDraft = {
  status: string;
  companyRole: string;
  companyName: string;
  website: string;
  address: string;
  note: string;
  people: PersonDraft[];
  open: boolean;
};

function emptyPerson(): PersonDraft {
  return { contactName: "", contactTitle: "", phone: "", email: "" };
}

function emptyRole(): RoleDraft {
  return {
    status: "",
    companyRole: "",
    companyName: "",
    website: "",
    address: "",
    note: "",
    people: [emptyPerson()],
    open: false,
  };
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

function roleHasContent(row: RoleDraft) {
  return Boolean(
    row.status.trim() ||
      row.companyRole.trim() ||
      row.companyName.trim() ||
      row.website.trim() ||
      row.address.trim() ||
      row.note.trim() ||
      row.people.some((person) => person.contactName || person.contactTitle || person.phone || person.email),
  );
}

/** 同一环节可以有多位联系人。整段都空就不建记录。 */
function partiesFromRole(role: string, row: RoleDraft) {
  const status = row.status.trim();
  const companyRole = row.companyRole.trim();
  const companyName = row.companyName.trim();
  const website = row.website.trim();
  const address = row.address.trim();
  const note = row.note.trim();
  const people = row.people
    .map((person) => ({
      contactName: person.contactName.trim(),
      contactTitle: person.contactTitle.trim(),
      phone: person.phone.trim(),
      email: person.email.trim(),
    }))
    .filter((person) => person.contactName || person.contactTitle || person.phone || person.email);
  if (!status && !companyRole && !companyName && !website && !address && !note && people.length === 0) {
    return [];
  }
  const rows = people.length > 0 ? people : [{ contactName: "", contactTitle: "", phone: "", email: "" }];
  return rows.map((person) => ({
    role,
    roleStatus: status || null,
    companyRole: companyRole || null,
    companyName: companyName || null,
    website: website || null,
    address: address || null,
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
    city: "",
    location: "",
    region: "",
    stage: "unknown",
    scheduleStatus: "",
    projectStatusRaw: "",
    projectValueText: "",
    projectValueOriginal: "",
    industry: "",
    siteArea: "",
    scheduleStart: "",
    scheduleEnd: "",
    tenderDeadline: "",
    contractorState: "",
    contractorListed: "",
    appointmentMethod: "",
    knownScope: "",
    gratingRelatedElements: "",
    contacts: emptyContacts(),
    ownerId: "",
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
    key: "status" | "companyRole" | "companyName" | "website" | "address" | "note",
    value: string,
  ) {
    setForm((current) => ({
      ...current,
      contacts: {
        ...current.contacts,
        [role]: { ...current.contacts[role], [key]: value, open: true },
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
          open: true,
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
        [role]: {
          ...current.contacts[role],
          open: true,
          people: [...current.contacts[role].people, emptyPerson()],
        },
      },
    }));
  }

  function toggleRole(role: (typeof PROJECT_PARTY_ROLE_CHOICES)[number]) {
    setForm((current) => ({
      ...current,
      contacts: {
        ...current.contacts,
        [role]: { ...current.contacts[role], open: !current.contacts[role].open },
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
          projectStatusRaw: form.projectStatusRaw.trim() || null,
          projectValueText: form.projectValueText.trim() || null,
          projectValueOriginal: form.projectValueOriginal.trim() || null,
          scheduleStart: form.scheduleStart.trim() || null,
          scheduleEnd: form.scheduleEnd.trim() || null,
          tenderDeadline: form.tenderDeadline.trim() || null,
          contractorState: form.contractorState.trim() || null,
          contractorListed: form.contractorListed.trim() || null,
          appointmentMethod: form.appointmentMethod.trim() || null,
          knownScope: form.knownScope.trim() || null,
          gratingRelatedElements: form.gratingRelatedElements.trim() || null,
          region: form.region.trim() || null,
          siteArea: form.siteArea.trim() || null,
          ownerId: mode === "assign" ? form.ownerId : null,
          city: form.city.trim() || null,
          location: form.location.trim() || null,
          industry: form.industry || null,
          potentialBuyers: form.potentialBuyers.trim() || null,
          productNeed,
          description: form.description.trim() || null,
          notes: form.notes.trim() || null,
          extraParties: ROLE_FORM_ORDER.flatMap((role) => partiesFromRole(role, form.contacts[role])),
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
        按资料页顺序填：抬头、信息、总包与工期、工程范围、各环节相关人。金额填人民币万元。草稿不分配，业务员看不到。
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
        <h2 className="text-sm font-semibold text-slate-800">1. 项目抬头</h2>
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
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">完整地址</label>
          <input
            type="text"
            value={form.location}
            onChange={(event) => set("location", event.target.value)}
            placeholder="镇、区、街道，按资料原文"
            className={inputClass}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
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
            <label className="mb-1 block text-sm font-medium text-slate-700">城市/省</label>
            <input
              type="text"
              value={form.city}
              onChange={(event) => set("city", event.target.value)}
              placeholder="Town / Province"
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">地区</label>
            <input
              type="text"
              value={form.region}
              onChange={(event) => set("region", event.target.value)}
              placeholder="如 Northern Vietnam"
              className={inputClass}
            />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-slate-800">2. 信息</h2>
        <div className="grid gap-4 sm:grid-cols-2">
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
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium text-slate-700">进度原文</label>
            <input
              type="text"
              value={form.scheduleStatus}
              onChange={(event) => set("scheduleStatus", event.target.value)}
              placeholder="资料 Status：，如 MAIN CONTRACT AWARDED | CONSTRUCTION COMMENCED"
              className={inputClass}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium text-slate-700">工程状态</label>
            <input
              type="text"
              value={form.projectStatusRaw}
              onChange={(event) => set("projectStatusRaw", event.target.value)}
              placeholder="资料 Project Status，如 Subcontractor(s) Appointed"
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">项目金额（人民币万元）</label>
            <input
              type="text"
              value={form.projectValueText}
              onChange={(event) => set("projectValueText", event.target.value)}
              placeholder="如 17073万元"
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">原币金额原文</label>
            <input
              type="text"
              value={form.projectValueOriginal}
              onChange={(event) => set("projectValueOriginal", event.target.value)}
              placeholder="对照用，如估算 650,000.00百万越南盾"
              className={inputClass}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium text-slate-700">用地面积</label>
            <input
              type="text"
              value={form.siteArea}
              onChange={(event) => set("siteArea", event.target.value)}
              placeholder="按资料原文"
              className={inputClass}
            />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-slate-800">3. 总包与工期</h2>
        <p className="text-xs text-slate-500">按资料原文填写。没有的留空。</p>
        <div className="grid gap-4 sm:grid-cols-2">
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
            <label className="mb-1 block text-sm font-medium text-slate-700">总包是否已披露</label>
            <select
              value={form.contractorListed}
              onChange={(event) => set("contractorListed", event.target.value)}
              className={inputClass}
            >
              <option value="">未填</option>
              <option value="是">是</option>
              <option value="否">否</option>
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
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-slate-800">4. 工程范围</h2>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">已知工程内容</label>
          <textarea
            value={form.knownScope}
            onChange={(event) => set("knownScope", event.target.value)}
            rows={4}
            placeholder="Development to include：已知工程内容，没有就留空"
            className={inputClass}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">钢格板相关建材</label>
          <textarea
            value={form.gratingRelatedElements}
            onChange={(event) => set("gratingRelatedElements", event.target.value)}
            rows={3}
            placeholder="只填和钢格板相关的 Building elements，如 grating、walkway、platform、stairs。卫浴窗帘等不要填"
            className={inputClass}
          />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-800">5. 各环节相关人</h2>
        <p className="text-xs text-slate-500">
          空环节先收着，点开再填。有内容的会自动展开。一个环节可以有多位联系人。
        </p>
        {ROLE_FORM_ORDER.map((role) => {
          const row = form.contacts[role];
          const open = row.open || roleHasContent(row);
          return (
            <div key={role} className="rounded-lg border border-slate-200">
              <button
                type="button"
                onClick={() => toggleRole(role)}
                className="flex w-full items-center justify-between px-3 py-2 text-left text-sm font-medium text-slate-800"
              >
                <span>
                  {projectPartyRoleLabel[role] ?? role}
                  {row.status ? <span className="ml-2 text-xs font-normal text-slate-500">{row.status}</span> : null}
                  {row.companyName ? (
                    <span className="ml-2 text-xs font-normal text-slate-500">{row.companyName}</span>
                  ) : null}
                </span>
                <span className="text-xs text-slate-500">{open ? "收起" : "填写"}</span>
              </button>
              {open ? (
                <div className="space-y-3 border-t border-slate-100 p-3">
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
                      value={row.companyRole}
                      onChange={(event) => setRole(role, "companyRole", event.target.value)}
                      placeholder="资料角色，如 Design Consultant"
                      className={inputClass}
                    />
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
                      value={row.address}
                      onChange={(event) => setRole(role, "address", event.target.value)}
                      placeholder="公司地址"
                      className={`${inputClass} sm:col-span-2`}
                    />
                    <input
                      type="text"
                      value={row.note}
                      onChange={(event) => setRole(role, "note", event.target.value)}
                      placeholder="备注。没有就留空"
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
                  <button type="button" onClick={() => addPerson(role)} className="text-sm text-slate-600 underline">
                    再加一位联系人
                  </button>
                </div>
              ) : null}
            </div>
          );
        })}
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-slate-800">6. 分配</h2>
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
          <p className="mt-1 text-xs text-slate-500">保存草稿不会分配；保存并分配才交给选中的业务员。</p>
        </div>
      </section>

      <section className="rounded-xl border border-stone-200">
        <button
          type="button"
          onClick={() => setShowMore((open) => !open)}
          className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium text-slate-700"
        >
          更多信息
          <span className="text-xs text-slate-500">{showMore ? "收起" : "产品、内部备注"}</span>
        </button>
        {showMore && (
          <div className="space-y-4 border-t border-stone-200 px-4 py-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">潜在采购公司</label>
              <input
                type="text"
                value={form.potentialBuyers}
                onChange={(event) => set("potentialBuyers", event.target.value)}
                className={inputClass}
              />
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
              <label className="mb-1 block text-sm font-medium text-slate-700">内部备注</label>
              <textarea
                value={form.notes}
                onChange={(event) => set("notes", event.target.value)}
                rows={2}
                placeholder="不要再把金额写这里，金额填上面的人民币万元"
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
