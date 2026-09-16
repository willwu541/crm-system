"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useToast } from "@/components/ui/Toast";
import { PROJECT_PARTY_ROLES } from "@/lib/export-constants";
import {
  displayInterestedProductsList,
  displayLabel,
  projectConfidenceLabel,
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
  owner: { id: string; name: string } | null;
  createdBy: { id: string; name: string };
  parties: Party[];
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

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ListBackLink listPath="/export/projects" className="text-sm text-slate-600 hover:underline">
          ← 返回项目列表
        </ListBackLink>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="export-btn-secondary rounded-md px-4 py-2 text-sm"
          >
            编辑项目
          </button>
          <ExportDeleteButton apiPath={`/api/export/projects/${projectId}`} redirectTo="/export/projects" />
        </div>
      </div>

      <div className="export-card export-detail-group space-y-4 p-7">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-slate-800">{project.name}</h1>
            <p className="mt-1 text-sm text-slate-500">{formatProjectPlace(project)}</p>
          </div>
          <span className="inline-flex rounded-full border border-stone-300 bg-stone-50 px-2 py-0.5 text-xs text-stone-700">
            {displayLabel(projectStageLabel, project.stage)}
          </span>
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
          按角色补 EPC、总包、分包等公司，填上网站、邮箱、WhatsApp、联系人。
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
                {PROJECT_PARTY_ROLES.map((r) => (
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
