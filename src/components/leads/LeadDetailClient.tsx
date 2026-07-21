"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useToast } from "@/components/ui/Toast";
import { parseResponseJson } from "@/lib/parse-response-json";
import { LeadForm } from "./LeadForm";
import { PhotoUploader, FileAttachmentList } from "@/components/ui/PhotoUploader";

const STATUS_LABELS: Record<string, string> = {
  NEW: "新线索", CONTACTED: "已联系", QUALIFIED: "已确认", CONVERTED: "已转化", LOST: "已流失",
};
const STATUS_COLORS: Record<string, string> = {
  NEW: "bg-blue-100 text-blue-700", CONTACTED: "bg-yellow-100 text-yellow-700",
  QUALIFIED: "bg-emerald-100 text-emerald-700", CONVERTED: "bg-purple-100 text-purple-700",
  LOST: "bg-slate-200 text-slate-600",
};

interface Lead {
  id: string; companyName: string; contactName: string; contactPhone: string;
  wechat?: string; region?: string; source?: string; industry?: string;
  productNeed?: string; intention?: string; status: string; remark?: string;
  ownerId: string; createdById: string; createdAt: string;
  owner: { id: string; name: string };
  customer?: { id: string; name: string } | null;
}

interface Props { leadId: string; }

export function LeadDetailClient({ leadId }: Props) {
  const { toast } = useToast();
  const router = useRouter();
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [converting, setConverting] = useState(false);

  async function fetchLead() {
    setLoading(true);
    try {
      const res = await fetch(`/api/leads/${leadId}`);
      const json = await parseResponseJson<{ data: Lead }>(res);
      if (res.ok) setLead(json.data ?? null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchLead(); }, [leadId]);

  async function handleConvert() {
    if (!lead) return;
    setConverting(true);
    try {
      const res = await fetch(`/api/leads/${lead.id}/convert`, { method: "POST" });
      const json = await parseResponseJson<{ error?: string; data?: { customer: { id: string; name: string } } }>(res);
      if (!res.ok) {
        toast(json.error ?? "转化失败");
      } else {
        toast(`已转为客户: ${json.data?.customer?.name || ""}`);
        fetchLead();
      }
    } catch (e) {
      toast(e instanceof Error ? e.message : "网络错误，请重试");
    } finally {
      setConverting(false);
    }
  }

  async function handleStatusChange(newStatus: string) {
    if (!lead) return;
    try {
      const res = await fetch(`/api/leads/${lead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("更新失败");
      fetchLead();
    } catch (e) {
      toast(e instanceof Error ? e.message : "更新失败");
    }
  }

  if (loading) return <div className="p-8 text-center text-slate-500">加载中...</div>;
  if (!lead) return <div className="p-8 text-center text-slate-500">线索不存在</div>;

  if (editing) {
    return (
      <div>
        <div className="mb-4"><button type="button" onClick={() => setEditing(false)} className="text-sm text-teal-700 hover:underline">&larr; 返回详情</button></div>
        <LeadForm
          isEditing
          leadId={lead.id}
          defaultValues={{ companyName: lead.companyName, contactName: lead.contactName, contactPhone: lead.contactPhone, wechat: lead.wechat || "", region: lead.region || "", source: lead.source || "", productNeed: lead.productNeed || "", remark: lead.remark || "" }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <Link href="/leads" className="text-sm text-teal-700 hover:underline">&larr; 返回列表</Link>
        <div className="flex gap-2">
          {lead.status !== "CONVERTED" && (
            <>
              <button onClick={handleConvert} disabled={converting}
                className="rounded-md bg-emerald-600 px-4 py-2 text-sm text-white hover:bg-emerald-700 disabled:opacity-50">
                {converting ? "转化中..." : "转为客户"}
              </button>
              <button onClick={() => setEditing(true)}
                className="rounded-md bg-teal-600 px-4 py-2 text-sm text-white hover:bg-teal-700">
                编辑
              </button>
            </>
          )}
        </div>
      </div>

      {/* 基本信息卡片 */}
      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <div className="mb-4 flex items-center gap-3">
          <h2 className="text-xl font-semibold text-slate-800">{lead.companyName}</h2>
          <span className={`rounded px-2 py-0.5 text-xs ${STATUS_COLORS[lead.status]}`}>
            {STATUS_LABELS[lead.status]}
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 text-sm">
          <div><span className="text-slate-500">联系人：</span>{lead.contactName}</div>
          <div><span className="text-slate-500">电话：</span>{lead.contactPhone}</div>
          {lead.wechat && <div><span className="text-slate-500">微信：</span>{lead.wechat}</div>}
          {lead.region && <div><span className="text-slate-500">地区：</span>{lead.region}</div>}
          {lead.source && <div><span className="text-slate-500">来源：</span>{lead.source}</div>}
          {lead.industry && <div><span className="text-slate-500">行业：</span>{lead.industry}</div>}
          {lead.intention && <div><span className="text-slate-500">意向：</span>{lead.intention}</div>}
          {lead.productNeed && <div className="sm:col-span-2"><span className="text-slate-500">产品需求：</span>{lead.productNeed}</div>}
          {lead.remark && <div className="sm:col-span-2"><span className="text-slate-500">备注：</span>{lead.remark}</div>}
          <div><span className="text-slate-500">负责人：</span>{lead.owner?.name}</div>
          <div><span className="text-slate-500">创建时间：</span>{new Date(lead.createdAt).toLocaleString("zh-CN")}</div>
          {lead.customer && (
            <div className="sm:col-span-2">
              <span className="text-slate-500">已转化为客户：</span>
              <Link href={`/customers/${lead.customer.id}`} className="text-teal-700 hover:underline ml-1">
                {lead.customer.name}
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* 照片/图纸附件 */}
      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium text-slate-800">照片/图纸</h3>
          <PhotoUploader entityType="lead" entityId={lead.id} onUploaded={() => {}} />
        </div>
        <FileAttachmentList entityType="lead" entityId={lead.id} />
      </div>

      {/* 状态流转 */}
      {lead.status !== "CONVERTED" && lead.status !== "LOST" && (
        <div className="rounded-lg border border-slate-200 bg-white p-6">
          <h3 className="mb-3 font-medium text-slate-700">状态操作</h3>
          <div className="flex flex-wrap gap-2">
            {lead.status === "NEW" && (
              <button onClick={() => handleStatusChange("CONTACTED")} className="rounded-md bg-yellow-100 px-3 py-1.5 text-sm text-yellow-800 hover:bg-yellow-200">
                标记为已联系
              </button>
            )}
            {lead.status === "CONTACTED" && (
              <button onClick={() => handleStatusChange("QUALIFIED")} className="rounded-md bg-emerald-100 px-3 py-1.5 text-sm text-emerald-800 hover:bg-emerald-200">
                标记为已确认
              </button>
            )}
            <button onClick={() => handleStatusChange("LOST")} className="rounded-md bg-red-50 px-3 py-1.5 text-sm text-red-700 hover:bg-red-100">
              标记为流失
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
