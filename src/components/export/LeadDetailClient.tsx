"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LeadForm } from "./LeadForm";

export function LeadDetailClient({ leadId }: { leadId: string }) {
  const [lead, setLead] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [converting, setConverting] = useState(false);

  useEffect(() => {
    fetch(`/api/export/leads/${leadId}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.data) setLead(json.data);
      })
      .finally(() => setLoading(false));
  }, [leadId]);

  async function handleConvert() {
    setConverting(true);
    try {
      const res = await fetch(`/api/export/leads/${leadId}/convert`, { method: "POST" });
      const json = await res.json();
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

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-800">{String(lead.companyName)}</h1>
        <div className="flex gap-2">
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
          <Link
            href="/export/leads"
            className="rounded-md border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50"
          >
            返回
          </Link>
        </div>
      </div>
      <LeadForm initial={lead} leadId={leadId} />
    </div>
  );
}
