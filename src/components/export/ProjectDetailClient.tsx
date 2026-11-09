"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useToast } from "@/components/ui/Toast";
import {
  PROJECT_DEMAND_STATUSES,
  PROJECT_PARTY_ROLE_CHOICES,
  PROJECT_PARTY_ROLE_CHOICE_TEXT,
} from "@/lib/export-constants";
import {
  displayInterestedProductsList,
  displayLabel,
  projectConfidenceLabel,
  projectEntryStatusLabel,
  projectIndustryLabel,
  projectPartyRoleLabel,
  projectStageLabel,
  projectStatusLabel,
} from "@/lib/export-display-labels";
import {
  displayGeneralContractor,
  displayOwnerOperator,
  displayPotentialBuyers,
  formatProjectPlace,
} from "@/lib/export/project-board";
import { countryLabel } from "@/lib/export/countries";
import { canonicalizeCountry } from "@/lib/export/countries";
import { parseResponseJson } from "@/lib/parse-response-json";
import { normalizeWebsiteUrl } from "@/lib/website";
import { ExportDeleteButton } from "./ExportDeleteButton";
import { ListBackLink } from "./shared/ListBackLink";
import { CountrySelect } from "./CountrySelect";
import { ProjectForm } from "./ProjectForm";
import { DuplicateErrorAlert, type DuplicateRecord } from "./DuplicateErrorAlert";

interface Party {
  id: string;
  role: string;
  companyName: string;
  country: string | null;
  website: string | null;
  contactName: string | null;
  contactTitle: string | null;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  linkedin: string | null;
  notes: string | null;
  leadId: string | null;
  foundBy: { id: string; name: string };
  lead: { id: string; companyName: string } | null;
  createdAt: string;
}

interface Project {
  id: string;
  name: string;
  country: string | null;
  city: string | null;
  location: string | null;
  industry: string | null;
  stage: string;
  confidence: string;
  entryStatus: string;
  ownerOperator: string | null;
  generalContractor: string | null;
  potentialBuyers: string | null;
  productNeed: string | null;
  description: string | null;
  source: string | null;
  tenderUrl: string | null;
  status: string;
  bidDeadline: string | null;
  notes: string | null;
  sourceProjectNumber: string | null;
  knownScope: string | null;
  needToVerify: string | null;
  askForRole: string | null;
  nextStep: string | null;
  feedbackDueAt: string | null;
  demandStatus: string;
  actualBuyerCompany: string | null;
  actualBuyerContact: string | null;
  purchaseProgress: string | null;
  owner: { id: string; name: string } | null;
  createdBy: { id: string; name: string };
  parties: Party[];
  canManage?: boolean;
}

function partyRoleOptions(current: string) {
  if ((PROJECT_PARTY_ROLE_CHOICES as readonly string[]).includes(current)) {
    return [...PROJECT_PARTY_ROLE_CHOICES];
  }
  return [...PROJECT_PARTY_ROLE_CHOICES, current];
}

const emptyParty = {
  role: "epc",
  companyName: "",
  country: "",
  website: "",
  contactName: "",
  contactTitle: "",
  email: "",
  phone: "",
  whatsapp: "",
  linkedin: "",
  notes: "",
};

export function ProjectDetailClient({ projectId }: { projectId: string }) {
  const { toast } = useToast();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [savingParty, setSavingParty] = useState(false);
  const [convertingId, setConvertingId] = useState<string | null>(null);
  const [partyError, setPartyError] = useState("");
  const [duplicate, setDuplicate] = useState<DuplicateRecord | null>(null);
  const [partyForm, setPartyForm] = useState(emptyParty);
  const [togglingEntry, setTogglingEntry] = useState(false);
  const [savingReport, setSavingReport] = useState(false);
  const [report, setReport] = useState({
    company: "",
    contact: "",
    progress: "",
    demand: "需求待核实",
  });

  async function fetchProject(opts?: { silent?: boolean }) {
    if (!opts?.silent) setLoading(true);
    try {
      const res = await fetch(`/api/export/projects/${projectId}`);
      const json = await parseResponseJson<{ data?: Project; error?: string }>(res);
      if (res.ok && json.data) setProject(json.data);
      else if (!opts?.silent) setProject(null);
    } catch (e) {
      console.error(e);
      if (!opts?.silent) setProject(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchProject();
  }, [projectId]);

  useEffect(() => {
    if (!project) return;
    setReport({
      company: project.actualBuyerCompany ?? "",
      contact: project.actualBuyerContact ?? "",
      progress: project.purchaseProgress ?? "",
      demand: project.demandStatus || "需求待核实",
    });
  }, [project]);

  async function toggleEntryStatus() {
    if (!project) return;
    const next = project.entryStatus === "entered" ? "pending" : "entered";
    setTogglingEntry(true);
    try {
      const res = await fetch(`/api/export/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entryStatus: next }),
      });
      const json = await parseResponseJson<{ error?: string; data?: Project }>(res);
      if (!res.ok) throw new Error(json.error ?? "更新失败");
      if (json.data) setProject(json.data);
      else setProject({ ...project, entryStatus: next });
      toast(next === "entered" ? "已标为已录入" : "已标为未录入");
    } catch (e) {
      toast(e instanceof Error ? e.message : "更新失败");
    } finally {
      setTogglingEntry(false);
    }
  }

  async function handleSaveReport(e: React.FormEvent) {
    e.preventDefault();
    setSavingReport(true);
    try {
      const res = await fetch(`/api/export/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actualBuyerCompany: report.company.trim() || null,
          actualBuyerContact: report.contact.trim() || null,
          purchaseProgress: report.progress.trim() || null,
          demandStatus: report.demand || "需求待核实",
        }),
      });
      const json = await parseResponseJson<{ error?: string; data?: Project }>(res);
      if (!res.ok) throw new Error(json.error ?? "保存失败");
      if (json.data) setProject(json.data);
      toast("已记下实际采购");
    } catch (err) {
      toast(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSavingReport(false);
    }
  }

  async function handleAddParty(e: React.FormEvent) {
    e.preventDefault();
    setPartyError("");
    setSavingParty(true);
    try {
      const res = await fetch(`/api/export/projects/${projectId}/parties`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...partyForm,
          country: canonicalizeCountry(partyForm.country) || partyForm.country.trim() || null,
          website: normalizeWebsiteUrl(partyForm.website),
        }),
      });
      const json = await parseResponseJson<{ error?: string }>(res);
      if (!res.ok) throw new Error(json.error ?? "添加失败");
      toast("已添加参与方");
      setPartyForm(emptyParty);
      fetchProject({ silent: true });
    } catch (err) {
      setPartyError(err instanceof Error ? err.message : "添加失败");
    } finally {
      setSavingParty(false);
    }
  }

  async function handleConvert(party: Party) {
    setConvertingId(party.id);
    setDuplicate(null);
    try {
      const res = await fetch(`/api/export/projects/${projectId}/parties/${party.id}/convert-lead`, {
        method: "POST",
      });
      const json = await parseResponseJson<{
        error?: string;
        data?: { id: string };
        linkedExisting?: boolean;
        duplicate?: DuplicateRecord;
      }>(res);
      if (!res.ok) {
        if (json.duplicate) setDuplicate(json.duplicate);
        throw new Error(json.error ?? "转为线索失败");
      }
      toast(json.linkedExisting ? "已关联已有线索" : "已转为线索");
      fetchProject({ silent: true });
    } catch (err) {
      toast(err instanceof Error ? err.message : "转为线索失败", "error");
    } finally {
      setConvertingId(null);
    }
  }

  if (loading) return <div className="p-8 text-center text-slate-500">加载中...</div>;
  if (!project) return <div className="p-8 text-center text-slate-500">项目不存在</div>;

  if (editing) {
    return (
      <div>
        <ProjectForm
          projectId={projectId}
          initial={project as unknown as Record<string, unknown>}
          onSuccess={() => {
            toast("保存成功");
            setEditing(false);
            fetchProject();
          }}
          onCancel={() => setEditing(false)}
        />
      </div>
    );
  }

  const products = project.productNeed
    ? project.productNeed.split(/[,，]/).map((s) => s.trim()).filter(Boolean)
    : [];
  const firstCall = [...project.parties].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  )[0];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ListBackLink listPath="/export/projects" className="text-sm text-slate-600 hover:underline">
          ← 返回项目列表
        </ListBackLink>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={togglingEntry}
            onClick={toggleEntryStatus}
            className="export-btn-secondary rounded-md px-4 py-2 text-sm"
          >
            {project.entryStatus === "entered" ? "改成未录入" : "标为已录入"}
          </button>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="export-btn-secondary rounded-md px-4 py-2 text-sm"
          >
            编辑项目
          </button>
          {project.canManage && (
            <ExportDeleteButton apiPath={`/api/export/projects/${projectId}`} redirectTo="/export/projects" />
          )}
        </div>
      </div>

      <div className="export-card space-y-3 border-amber-200 bg-[#fbf7ef] p-6">
        <h2 className="text-base font-semibold text-slate-800">这一通怎么打</h2>
        {firstCall ? (
          <div className="text-sm text-slate-800">
            <p className="text-base font-medium">
              {firstCall.companyName}
              <span className="ml-2 text-sm font-normal text-slate-500">
                {displayLabel(projectPartyRoleLabel, firstCall.role)}
              </span>
            </p>
            <p className="mt-1">联系人：{firstCall.contactName || "未留姓名，打总机后转岗位"}</p>
            <p>电话：{firstCall.phone || "—"}</p>
            {firstCall.email ? <p>邮箱：{firstCall.email}</p> : null}
          </div>
        ) : (
          <p className="text-sm text-slate-500">
            还没有第一通要找的公司。角色选{PROJECT_PARTY_ROLE_CHOICE_TEXT}。例如：Perunding BSK（顾问）· +60 88 498 838
          </p>
        )}
        <p className="text-sm text-slate-800">
          <span className="text-slate-500">请转：</span>
          {project.askForRole || (
            <span className="text-slate-400">例如：负责脱水车间设备平台的项目经理或采购</span>
          )}
        </p>
        <p className="whitespace-pre-wrap text-sm text-slate-800">
          <span className="text-slate-500">要问什么：</span>
          {project.nextStep || (
            <span className="text-slate-400">
              例如：确认是否用钢格板、是否已下单。如果归分包，拿到分包公司名和采购联系人
            </span>
          )}
        </p>
        <p className="text-sm text-slate-700">
          <span className="text-slate-500">为什么跟：</span>
          {[project.knownScope, project.needToVerify].filter(Boolean).join("。") || (
            <span className="text-slate-400">例如：已知有新增脱水建筑和设备。平台和走道是否使用钢格板待核实</span>
          )}
        </p>
        <p className="text-sm text-slate-700">
          <span className="text-slate-500">需求：</span>
          {project.demandStatus || "需求待核实"}
          {project.feedbackDueAt
            ? ` · 希望 ${new Date(project.feedbackDueAt).toLocaleDateString("zh-CN")} 前反馈`
            : ""}
        </p>
      </div>

      <form onSubmit={handleSaveReport} className="export-card space-y-4 p-6">
        <div>
          <h2 className="text-base font-semibold text-slate-800">打完回填</h2>
          <p className="mt-1 text-sm text-slate-500">
            总包或第一通联系人仍是入口。实际采购公司另外记，没问到就留空，显示为待确认。
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">实际采购公司</label>
            <input
              type="text"
              value={report.company}
              onChange={(e) => setReport((current) => ({ ...current, company: e.target.value }))}
              placeholder="待确认"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            <p className="mt-1 text-xs text-slate-500">当前：{report.company.trim() || "待确认"}</p>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">采购联系人</label>
            <input
              type="text"
              value={report.contact}
              onChange={(e) => setReport((current) => ({ ...current, contact: e.target.value }))}
              placeholder="姓名和电话"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">需求</label>
            <select
              value={report.demand}
              onChange={(e) => setReport((current) => ({ ...current, demand: e.target.value }))}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              {PROJECT_DEMAND_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium text-slate-700">采购进度</label>
            <textarea
              value={report.progress}
              onChange={(e) => setReport((current) => ({ ...current, progress: e.target.value }))}
              rows={2}
              placeholder="例如：总包说平台归分包，还没下单"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={savingReport}
          className="export-btn-primary rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          {savingReport ? "保存中..." : "保存回填"}
        </button>
      </form>

      <div className="export-card export-detail-group space-y-4 p-7">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-slate-800">
              {project.name}
              {project.sourceProjectNumber ? (
                <span className="ml-2 text-sm font-normal text-slate-500">LM {project.sourceProjectNumber}</span>
              ) : null}
            </h1>
            <p className="mt-1 text-sm text-slate-500">{formatProjectPlace(project)}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex rounded-full border px-2 py-0.5 text-xs ${
                project.entryStatus === "entered"
                  ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                  : "border-amber-300 bg-amber-50 text-amber-800"
              }`}
            >
              {displayLabel(projectEntryStatusLabel, project.entryStatus || "pending")}
            </span>
            <span className="inline-flex rounded-full border border-stone-300 bg-stone-50 px-2 py-0.5 text-xs text-stone-700">
              {displayLabel(projectStageLabel, project.stage)}
            </span>
          </div>
        </div>
        <div className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <span className="text-slate-500">行业：</span>
            {displayLabel(projectIndustryLabel, project.industry)}
          </div>
          <div>
            <span className="text-slate-500">可靠度：</span>
            {displayLabel(projectConfidenceLabel, project.confidence)}
          </div>
          <div>
            <span className="text-slate-500">业主/运营商：</span>
            {displayOwnerOperator(project, project.parties) || "—"}
          </div>
          <div>
            <span className="text-slate-500">总包：</span>
            {displayGeneralContractor(project, project.parties) || "—"}
          </div>
          <div className="sm:col-span-2">
            <span className="text-slate-500">潜在采购公司：</span>
            {displayPotentialBuyers(project, project.parties) || "—"}
          </div>
          <div>
            <span className="text-slate-500">跟进人：</span>
            {project.owner?.name ?? "未指定"}
          </div>
          <div>
            <span className="text-slate-500">跟进状态：</span>
            {displayLabel(projectStatusLabel, project.status)}
          </div>
          <div>
            <span className="text-slate-500">录入人：</span>
            {project.createdBy.name}
          </div>
          <div>
            <span className="text-slate-500">截止：</span>
            {project.bidDeadline ? new Date(project.bidDeadline).toLocaleDateString("zh-CN") : "-"}
          </div>
          <div>
            <span className="text-slate-500">渠道：</span>
            {project.source || "-"}
          </div>
          <div className="sm:col-span-2">
            <span className="text-slate-500">产品：</span>
            {displayInterestedProductsList(products)}
          </div>
          {project.tenderUrl && (
            <div className="sm:col-span-2">
              <span className="text-slate-500">链接：</span>
              <a href={project.tenderUrl} target="_blank" rel="noreferrer" className="text-teal-600 hover:underline">
                {project.tenderUrl}
              </a>
            </div>
          )}
          {project.description && (
            <div className="sm:col-span-2 whitespace-pre-wrap text-slate-700">{project.description}</div>
          )}
          {project.notes && (
            <div className="sm:col-span-2 whitespace-pre-wrap text-slate-600">备注：{project.notes}</div>
          )}
        </div>
      </div>

      <div className="export-card p-7">
        <h2 className="mb-1 text-base font-semibold text-slate-800">找到的公司 / 联系人</h2>
        <p className="mb-4 text-sm text-slate-500">
          按角色补{PROJECT_PARTY_ROLE_CHOICE_TEXT}。已保存的钢构加工厂、其他等旧角色仍会显示。填上网站、邮箱、WhatsApp、联系人。
        </p>
        {duplicate && (
          <div className="mb-3">
            <DuplicateErrorAlert error="与已有客户重复，不能直接转线索。" duplicate={duplicate} />
          </div>
        )}
        {project.parties.length === 0 ? (
          <p className="mb-4 text-sm text-slate-500">还没有找到相关公司，在下方添加。</p>
        ) : (
          <div className="mb-6 overflow-x-auto">
            <table className="export-table w-full text-sm">
              <thead className="border-b border-slate-200">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-slate-700">角色</th>
                  <th className="px-3 py-2 text-left font-medium text-slate-700">公司</th>
                  <th className="px-3 py-2 text-left font-medium text-slate-700">联系人</th>
                  <th className="px-3 py-2 text-left font-medium text-slate-700">联系方式</th>
                  <th className="px-3 py-2 text-left font-medium text-slate-700">找到人</th>
                  <th className="px-3 py-2 text-left font-medium text-slate-700">操作</th>
                </tr>
              </thead>
              <tbody>
                {project.parties.map((party) => {
                  const site = normalizeWebsiteUrl(party.website);
                  return (
                    <tr key={party.id} className="border-b border-slate-100 align-top">
                      <td className="px-3 py-2 text-slate-700">
                        {displayLabel(projectPartyRoleLabel, party.role)}
                      </td>
                      <td className="px-3 py-2">
                        <div className="font-medium text-slate-800">{party.companyName}</div>
                        <div className="text-xs text-slate-500">
                          {countryLabel(party.country) || party.country || "-"}
                        </div>
                        {site && (
                          <a href={site} target="_blank" rel="noreferrer" className="text-xs text-teal-600 hover:underline">
                            {site}
                          </a>
                        )}
                      </td>
                      <td className="px-3 py-2 text-slate-600">
                        {party.contactName || "-"}
                        {party.contactTitle ? <div className="text-xs text-slate-500">{party.contactTitle}</div> : null}
                      </td>
                      <td className="px-3 py-2 text-slate-600">
                        <div className="space-y-0.5 text-xs">
                          {party.email ? <div>邮箱 {party.email}</div> : null}
                          {party.phone ? <div>电话 {party.phone}</div> : null}
                          {party.whatsapp ? <div>WhatsApp {party.whatsapp}</div> : null}
                          {party.linkedin ? <div>LinkedIn {party.linkedin}</div> : null}
                          {!party.email && !party.phone && !party.whatsapp && !party.linkedin ? "-" : null}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-slate-600">{party.foundBy.name}</td>
                      <td className="px-3 py-2">
                        <div className="flex flex-col items-start gap-1">
                          {party.lead ? (
                            <Link href={`/export/leads/${party.lead.id}`} className="text-teal-600 hover:underline">
                              已有线索
                            </Link>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleConvert(party)}
                              disabled={convertingId === party.id}
                              className="text-teal-600 hover:underline disabled:opacity-50"
                            >
                              {convertingId === party.id ? "处理中..." : "转为线索"}
                            </button>
                          )}
                          <ExportDeleteButton
                            apiPath={`/api/export/projects/${projectId}/parties/${party.id}`}
                            onDeleted={() => fetchProject({ silent: true })}
                            label="删除"
                            className="text-sm text-red-600 hover:underline disabled:opacity-50"
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <form onSubmit={handleAddParty} className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
          <h3 className="text-sm font-medium text-slate-800">添加参与方</h3>
          {partyError && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{partyError}</div>}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">角色 *</label>
              <select
                value={partyForm.role}
                onChange={(e) => setPartyForm((f) => ({ ...f, role: e.target.value }))}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              >
                {partyRoleOptions(partyForm.role).map((r) => (
                  <option key={r} value={r}>
                    {projectPartyRoleLabel[r] ?? r}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">公司名 *</label>
              <input
                type="text"
                required
                value={partyForm.companyName}
                onChange={(e) => setPartyForm((f) => ({ ...f, companyName: e.target.value }))}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">国家</label>
              <CountrySelect
                value={partyForm.country}
                allowCustom
                emptyLabel="请选择国家"
                onChange={(country) => setPartyForm((f) => ({ ...f, country }))}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">网站</label>
              <input
                type="text"
                value={partyForm.website}
                onChange={(e) => setPartyForm((f) => ({ ...f, website: e.target.value }))}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">联系人</label>
              <input
                type="text"
                value={partyForm.contactName}
                onChange={(e) => setPartyForm((f) => ({ ...f, contactName: e.target.value }))}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">职位</label>
              <input
                type="text"
                value={partyForm.contactTitle}
                onChange={(e) => setPartyForm((f) => ({ ...f, contactTitle: e.target.value }))}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">邮箱</label>
              <input
                type="email"
                value={partyForm.email}
                onChange={(e) => setPartyForm((f) => ({ ...f, email: e.target.value }))}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">电话</label>
              <input
                type="text"
                value={partyForm.phone}
                onChange={(e) => setPartyForm((f) => ({ ...f, phone: e.target.value }))}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">WhatsApp</label>
              <input
                type="text"
                value={partyForm.whatsapp}
                onChange={(e) => setPartyForm((f) => ({ ...f, whatsapp: e.target.value }))}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">LinkedIn</label>
              <input
                type="text"
                value={partyForm.linkedin}
                onChange={(e) => setPartyForm((f) => ({ ...f, linkedin: e.target.value }))}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <label className="mb-1 block text-xs font-medium text-slate-600">备注</label>
              <input
                type="text"
                value={partyForm.notes}
                onChange={(e) => setPartyForm((f) => ({ ...f, notes: e.target.value }))}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={savingParty}
            className="export-btn-primary rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50"
          >
            {savingParty ? "添加中..." : "添加"}
          </button>
        </form>
      </div>
    </div>
  );
}
