"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LeadForm } from "./LeadForm";
import { ExportDeleteButton } from "./ExportDeleteButton";
import { parseResponseJson } from "@/lib/parse-response-json";
import { customerTypeLabel, leadStatusLabel } from "@/lib/export-display-labels";
import { getWebsiteHost, normalizeWebsiteUrl } from "@/lib/website";

export function LeadDetailClient({ leadId }: { leadId: string }) {
  const [lead, setLead] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [converting, setConverting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/export/leads/${leadId}`);
        const json = await parseResponseJson<{ data?: Record<string, unknown>; error?: string }>(res);
        if (!cancelled && json.data) setLead(json.data);
      } catch {
        if (!cancelled) setLead(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [leadId]);

  async function handleConvert() {
    setConverting(true);
    try {
      const res = await fetch(`/api/export/leads/${leadId}/convert`, { method: "POST" });
      const json = await parseResponseJson<{
        error?: string;
        data?: { id?: string };
        customerId?: string;
      }>(res);
      if (!res.ok) throw new Error(json.error ?? "转化失败");
      const cid = json.data?.id ?? json.customerId;
      if (cid) window.location.href = `/export/customers/${cid}`;
    } catch (e) {
      alert(e instanceof Error ? e.message : "转化失败");
    } finally {
      setConverting(false);
    }
  }

  if (loading) return <div className="p-8 text-center text-slate-500">加载中...</div>;
  if (!lead) return <div className="p-8 text-center text-slate-500">线索不存在</div>;

  const owner =
    lead.owner && typeof lead.owner === "object" && "name" in lead.owner
      ? String((lead.owner as { name: string }).name)
      : "-";
  const websiteValue = typeof lead.website === "string" ? lead.website : null;
  const websiteUrl = normalizeWebsiteUrl(websiteValue);
  const websiteHost = getWebsiteHost(websiteValue);

  return (
    <div className="space-y-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">{String(lead.companyName)}</h1>
          <p className="text-sm text-slate-500">
            {leadStatusLabel[String(lead.status ?? "")] ?? String(lead.status ?? "-")} · {owner}
          </p>
        </div>
        <div className="flex gap-2">
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
              onClick={handleConvert}
              disabled={converting}
              className="rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
            >
              {converting ? "转化中..." : "转客户"}
            </button>
          )}
          {lead.convertedToCustomerId ? (
            <Link
              href={`/export/customers/${String(lead.convertedToCustomerId)}`}
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
      <div className="grid gap-4 rounded-lg border border-slate-200 bg-white p-4 text-sm lg:grid-cols-4">
        <div>
          <p className="text-slate-500">官网</p>
          {websiteUrl ? (
            <a href={websiteUrl} target="_blank" rel="noreferrer" className="font-medium text-teal-600 hover:underline">
              {websiteHost ?? websiteValue}
            </a>
          ) : (
            <p className="font-medium text-slate-800">未填写</p>
          )}
        </div>
        <div>
          <p className="text-slate-500">联系方式</p>
          <p className="font-medium text-slate-800">{String(lead.phone ?? lead.whatsapp ?? "-")}</p>
          <p className="text-slate-500">{String(lead.email ?? "未填写邮箱")}</p>
        </div>
        <div>
          <p className="text-slate-500">国家 / 类型</p>
          <p className="font-medium text-slate-800">{String(lead.country ?? "-")}</p>
          <p className="text-slate-500">
            {customerTypeLabel[String(lead.customerType ?? "")] ?? String(lead.customerType ?? "未填写类型")}
          </p>
        </div>
        <div>
          <p className="text-slate-500">来源 / 负责人</p>
          <p className="font-medium text-slate-800">{String(lead.sourceChannel ?? "未填写来源")}</p>
          <p className="text-slate-500">{owner}</p>
        </div>
      </div>
      <LeadForm initial={lead} leadId={leadId} />
    </div>
  );
}
