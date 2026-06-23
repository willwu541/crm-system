"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useToast } from "@/components/ui/Toast";
import { LeadForm } from "./LeadForm";
import { ExportDeleteButton } from "./ExportDeleteButton";
import { QuickContactModal } from "./QuickContactModal";
import { ConvertOnboardModal } from "./ConvertOnboardModal";
import { ConvertLeadModal, type ConvertLeadPayload } from "./ConvertLeadModal";
import { LeadTasksPanel } from "./LeadTasksPanel";
import { NextFollowUpModal } from "./NextFollowUpModal";
import { SocialLinksBar } from "./SocialLinksBar";
import { parseResponseJson } from "@/lib/parse-response-json";
import {
  activityDirectionLabel,
  activityTypeLabel,
  customerTypeLabel,
  emailTemplateCategoryLabel,
  interestedProductLabel,
  leadStatusLabel,
  sourceChannelLabel,
} from "@/lib/export-display-labels";
import { getWebsiteHost, normalizeWebsiteUrl } from "@/lib/website";

interface LeadActivity {
  id: string;
  type: string;
  direction: string;
  subject: string | null;
  content: string | null;
  customerFeedback: string | null;
  createdAt: string;
  owner: { id: string; name: string };
  template: { id: string; name: string; category: string; language: string } | null;
}

interface Lead {
  id: string;
  companyName: string;
  website: string | null;
  country: string | null;
  city: string | null;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  linkedin: string | null;
  facebook: string | null;
  tiktok: string | null;
  productInterest: string | null;
  customerType: string | null;
  sourceChannel: string | null;
  status: string;
  contactCount: number;
  lastContactAt: string | null;
  nextFollowUpAt: string | null;
  convertedToCustomerId: string | null;
  notes: string | null;
  owner: { id: string; name: string };
}

export function LeadDetailClient({ leadId }: { leadId: string }) {
  const { toast } = useToast();
  const [lead, setLead] = useState<Lead | null>(null);
  const [activities, setActivities] = useState<LeadActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [converting, setConverting] = useState(false);
  const [convertOpen, setConvertOpen] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const [quickDirection, setQuickDirection] = useState<"outbound" | "inbound">("outbound");
  const [notes, setNotes] = useState("");
  const [onboard, setOnboard] = useState<{ customerId: string; companyName: string } | null>(null);
  const [followUpOpen, setFollowUpOpen] = useState(false);

  const sortedActivities = useMemo(
    () =>
      [...activities].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    [activities],
  );

  async function fetchAll(opts?: { silent?: boolean }) {
    if (!opts?.silent) setLoading(true);
    try {
      const [leadRes, actRes] = await Promise.all([
        fetch(`/api/export/leads/${leadId}`),
        fetch(`/api/export/activities?leadId=${leadId}`),
      ]);
      const leadJson = await parseResponseJson<{ data?: Lead; error?: string }>(leadRes);
      const actJson = await parseResponseJson<{ data?: LeadActivity[] }>(actRes);
      if (!leadRes.ok) {
        throw new Error(leadJson.error ?? "加载线索失败");
      }
      if (leadJson.data) setLead(leadJson.data);
      if (actJson.data) setActivities(actJson.data);
    } catch (e) {
      if (!opts?.silent) {
        toast(e instanceof Error ? e.message : "加载失败", "error");
      }
    } finally {
      if (!opts?.silent) setLoading(false);
    }
  }

  useEffect(() => {
    fetchAll();
  }, [leadId]);

  useEffect(() => {
    if (lead) setNotes(lead.notes ?? "");
  }, [lead?.id, lead?.notes]);

  async function handleConvert(payload?: ConvertLeadPayload) {
    setConverting(true);
    try {
      const res = await fetch(`/api/export/leads/${leadId}/convert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerStatus: payload?.customerStatus,
          nextFollowUpAt: payload?.nextFollowUpAt
            ? new Date(payload.nextFollowUpAt).toISOString()
            : undefined,
          createTaskTitle: payload?.createTaskTitle,
          createTaskDueAt: payload?.createTaskDueAt
            ? new Date(payload.createTaskDueAt).toISOString()
            : undefined,
        }),
      });
      const json = await parseResponseJson<{
        error?: string;
        data?: { id?: string };
        customerId?: string;
      }>(res);
      if (!res.ok) throw new Error(json.error ?? "转化失败");
      const cid = json.data?.id ?? json.customerId;
      toast("转化成功");
      setConvertOpen(false);
      if (cid && lead) {
        setOnboard({ customerId: cid, companyName: lead.companyName });
        fetchAll({ silent: true });
      }
    } catch (e) {
      toast(e instanceof Error ? e.message : "转化失败", "error");
    } finally {
      setConverting(false);
    }
  }

  if (loading) return <div className="p-8 text-center text-slate-500">加载中...</div>;
  if (!lead) return <div className="p-8 text-center text-slate-500">线索不存在</div>;

  const owner = lead.owner?.name ?? "-";
  const websiteUrl = normalizeWebsiteUrl(lead.website);
  const websiteHost = getWebsiteHost(lead.website);

  const daysSinceLast = lead.lastContactAt
    ? Math.floor((Date.now() - new Date(lead.lastContactAt).getTime()) / (24 * 3600 * 1000))
    : null;

  return (
    <div className="space-y-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">{lead.companyName}</h1>
          <p className="text-sm text-slate-500">
            {leadStatusLabel[lead.status] ?? lead.status} · {owner} ·
            {" 已联系 "}<span className="font-medium text-slate-700">{lead.contactCount}</span> 次
            {daysSinceLast != null && (
              <>
                {" · 上次 "}
                <span className={daysSinceLast >= 7 ? "font-medium text-amber-600" : "font-medium text-slate-700"}>
                  {daysSinceLast === 0 ? "今天" : `${daysSinceLast} 天前`}
                </span>
              </>
            )}
            {lead.nextFollowUpAt && (
              <>
                {" · 下次跟进 "}
                <span className="font-medium text-teal-700">
                  {new Date(lead.nextFollowUpAt).toLocaleString("zh-CN")}
                </span>
              </>
            )}
          </p>
          <SocialLinksBar
            email={lead.email}
            phone={lead.phone}
            whatsapp={lead.whatsapp}
            linkedin={lead.linkedin}
            facebook={lead.facebook}
            tiktok={lead.tiktok}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {lead.status !== "converted" && (
            <>
              <button
                type="button"
                onClick={() => {
                  setQuickDirection("outbound");
                  setQuickOpen(true);
                }}
                className="rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
              >
                标记一次主动联系
              </button>
              <button
                type="button"
                onClick={() => {
                  setQuickDirection("inbound");
                  setQuickOpen(true);
                }}
                className="rounded-md border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50"
              >
                记录客户回复
              </button>
            </>
          )}
          {websiteUrl ? (
            <a
              href={websiteUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-md border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50"
            >
              打开官网
            </a>
          ) : null}
          {lead.status !== "converted" && (
            <button
              onClick={() => setConvertOpen(true)}
              disabled={converting}
              className="rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
            >
              {converting ? "转化中..." : "转客户"}
            </button>
          )}
          {lead.convertedToCustomerId ? (
            <Link
              href={`/export/customers/${lead.convertedToCustomerId}`}
              className="rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
            >
              查看客户
            </Link>
          ) : null}
          <ExportDeleteButton
            apiPath={`/api/export/leads/${leadId}`}
            redirectTo="/export/leads"
            label="删除线索"
            className="rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700 hover:bg-red-100 disabled:opacity-50"
          />
          <Link
            href="/export/leads"
            className="rounded-md border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50"
          >
            返回
          </Link>
        </div>
      </div>

      <div className="grid gap-4 rounded-lg border border-slate-200 bg-white p-4 text-sm lg:grid-cols-5">
        <div>
          <p className="text-slate-500">官网</p>
          {websiteUrl ? (
            <a href={websiteUrl} target="_blank" rel="noreferrer" className="font-medium text-teal-600 hover:underline">
              {websiteHost ?? lead.website}
            </a>
          ) : (
            <p className="font-medium text-slate-800">未填写</p>
          )}
        </div>
        <div>
          <p className="text-slate-500">联系方式</p>
          <p className="font-medium text-slate-800">{lead.phone ?? lead.whatsapp ?? "-"}</p>
          <p className="text-slate-500">{lead.email ?? "未填写邮箱"}</p>
        </div>
        <div>
          <p className="text-slate-500">国家 / 类型</p>
          <p className="font-medium text-slate-800">{lead.country ?? "-"}</p>
          <p className="text-slate-500">
            {customerTypeLabel[lead.customerType ?? ""] ?? lead.customerType ?? "未填写类型"}
          </p>
        </div>
        <div>
          <p className="text-slate-500">来源 / 负责人</p>
          <p className="font-medium text-slate-800">
            {sourceChannelLabel[lead.sourceChannel ?? ""] ?? lead.sourceChannel ?? "未填写来源"}
          </p>
          <p className="text-slate-500">{owner}</p>
        </div>
        <div>
          <p className="text-slate-500">产品意向</p>
          <p className="font-medium text-slate-800">
            {lead.productInterest
              ? lead.productInterest
                  .split(/[,，]/)
                  .map((s) => s.trim())
                  .filter(Boolean)
                  .map((p) => interestedProductLabel[p] ?? p)
                  .join("、")
              : "未填写"}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <h2 className="mb-2 font-medium text-slate-700">备注</h2>
            <p className="mb-2 text-xs text-slate-500">与右侧「保存」一并提交；可在此展开查看与编辑。</p>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={10}
              placeholder="客户背景、沟通要点、下次跟进计划…"
              className="min-h-[220px] w-full resize-y rounded-md border border-slate-300 px-3 py-2 text-sm leading-relaxed"
            />
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-medium text-slate-700">沟通时间轴</h2>
              <span className="text-xs text-slate-400">
                {sortedActivities.length} 条 · 时间倒序（最新在上）
              </span>
            </div>
            {sortedActivities.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-500">
                还没有沟通记录。点击右上「标记一次主动联系」开始。
              </p>
            ) : (
              <ul className="space-y-3">
                {sortedActivities.map((a) => {
                  const isInbound = a.direction === "inbound";
                  return (
                    <li
                      key={a.id}
                      className={`flex ${isInbound ? "justify-start" : "justify-end"}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg border p-3 text-sm ${
                          isInbound
                            ? "border-slate-200 bg-slate-50"
                            : "border-teal-200 bg-teal-50"
                        }`}
                      >
                        <div className="mb-1 flex flex-wrap items-center gap-2 text-xs">
                          <span
                            className={`rounded px-2 py-0.5 ${
                              isInbound ? "bg-slate-200 text-slate-700" : "bg-teal-200 text-teal-900"
                            }`}
                          >
                            {activityDirectionLabel[a.direction] ?? a.direction}
                          </span>
                          <span className="rounded bg-white px-2 py-0.5 text-slate-600">
                            {activityTypeLabel[a.type] ?? a.type}
                          </span>
                          {a.template && (
                            <span className="rounded bg-white px-2 py-0.5 text-slate-600">
                              模板：{emailTemplateCategoryLabel[a.template.category] ?? a.template.category}
                            </span>
                          )}
                          <span className="text-slate-500">{a.owner.name}</span>
                          <span className="text-slate-400">
                            {new Date(a.createdAt).toLocaleString("zh-CN")}
                          </span>
                          <ExportDeleteButton
                            apiPath={`/api/export/activities/${a.id}`}
                            onDeleted={() => fetchAll({ silent: true })}
                            label="删除"
                            className="text-xs text-red-600 hover:underline"
                          />
                        </div>
                        {a.subject && (
                          <p className="font-medium text-slate-800">{a.subject}</p>
                        )}
                        {a.content && (
                          <pre className="mt-1 whitespace-pre-wrap font-sans text-slate-700">
                            {a.content}
                          </pre>
                        )}
                        {a.customerFeedback && (
                          <div className="mt-2 rounded bg-white p-2 text-xs">
                            <span className="font-medium">客户反馈：</span>
                            {a.customerFeedback}
                          </div>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          {lead.status !== "converted" && <LeadTasksPanel leadId={leadId} />}
        </div>

        <div className="space-y-6">
          <LeadForm
            initial={lead as unknown as Record<string, unknown>}
            leadId={leadId}
            hideNotes
            notesValue={notes}
            onNotesValueChange={setNotes}
            onSuccess={() => fetchAll({ silent: true })}
          />
        </div>
      </div>

      <QuickContactModal
        open={quickOpen}
        onClose={() => setQuickOpen(false)}
        leadId={leadId}
        contactCount={lead.contactCount}
        defaultDirection={quickDirection}
        contactEmail={lead.email}
        contactWhatsapp={lead.whatsapp}
        title={quickDirection === "outbound" ? "记录一次主动联系" : "记录客户回复"}
        onSuccess={() => {
          toast("已记录");
          fetchAll({ silent: true });
        }}
      />

      {lead.status !== "converted" && (
        <ConvertLeadModal
          open={convertOpen}
          companyName={lead.companyName}
          loading={converting}
          onClose={() => setConvertOpen(false)}
          onSubmit={handleConvert}
        />
      )}

      {onboard && (
        <ConvertOnboardModal
          open={!!onboard}
          customerId={onboard.customerId}
          companyName={onboard.companyName}
          onClose={() => setOnboard(null)}
          onSetFollowUp={() => {
            setFollowUpOpen(true);
          }}
        />
      )}

      {onboard && followUpOpen && (
        <NextFollowUpModal
          open={followUpOpen}
          customerId={onboard.customerId}
          customerName={onboard.companyName}
          currentNextFollowUpAt={null}
          onClose={() => {
            setFollowUpOpen(false);
            setOnboard(null);
          }}
          onSuccess={() => {
            toast("已设置下次跟进");
            setFollowUpOpen(false);
            setOnboard(null);
          }}
        />
      )}
    </div>
  );
}
