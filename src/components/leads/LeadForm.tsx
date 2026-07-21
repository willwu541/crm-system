"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";
import { parseResponseJson } from "@/lib/parse-response-json";

interface LeadFormProps {
  defaultValues?: { companyName?: string; contactName?: string; contactPhone?: string; wechat?: string; region?: string; source?: string; productNeed?: string; remark?: string; };
  isEditing?: boolean;
  leadId?: string;
}

export function LeadForm({ defaultValues, isEditing, leadId }: LeadFormProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [showMore, setShowMore] = useState(false);

  const [companyName, setCompanyName] = useState(defaultValues?.companyName || "");
  const [contactName, setContactName] = useState(defaultValues?.contactName || "");
  const [contactPhone, setContactPhone] = useState(defaultValues?.contactPhone || "");
  const [wechat, setWechat] = useState(defaultValues?.wechat || "");
  const [region, setRegion] = useState(defaultValues?.region || "");
  const [source, setSource] = useState(defaultValues?.source || "");
  const [productNeed, setProductNeed] = useState(defaultValues?.productNeed || "");
  const [remark, setRemark] = useState(defaultValues?.remark || "");

  const isValid = companyName.trim() && contactName.trim() && contactPhone.trim();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid) return;
    setError("");
    setSubmitting(true);
    try {
      const url = isEditing ? `/api/leads/${leadId}` : "/api/leads";
      const res = await fetch(url, {
        method: isEditing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: companyName.trim(),
          contactName: contactName.trim(),
          contactPhone: contactPhone.trim(),
          wechat: wechat.trim() || undefined,
          region: region.trim() || undefined,
          source: source.trim() || undefined,
          productNeed: productNeed.trim() || undefined,
          remark: remark.trim() || undefined,
        }),
      });
      const json = await parseResponseJson<{ error?: string }>(res);
      if (!res.ok) throw new Error(json.error ?? "保存失败");
      toast(isEditing ? "已更新" : "创建成功");
      router.push("/leads");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存失败");
    } finally { setSubmitting(false); }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-slate-200 bg-white p-6 max-w-lg">
      {error && <div className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}

      {/* 核心三字段：大字输入框 */}
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium">公司名称 *</label>
          <input type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)} required
            placeholder="输入客户公司名"
            className="w-full rounded-md border border-slate-300 px-3 py-3 text-base" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium">联系人 *</label>
            <input type="text" value={contactName} onChange={(e) => setContactName(e.target.value)} required
              placeholder="王经理"
              className="w-full rounded-md border border-slate-300 px-3 py-3 text-base" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">电话 *</label>
            <input type="text" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} required
              placeholder="手机号或座机"
              className="w-full rounded-md border border-slate-300 px-3 py-3 text-base" />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">产品需求</label>
          <input type="text" value={productNeed} onChange={(e) => setProductNeed(e.target.value)}
            placeholder="如：钢格板G303/30/100，500平米"
            className="w-full rounded-md border border-slate-300 px-3 py-2" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">备注</label>
          <textarea value={remark} onChange={(e) => setRemark(e.target.value)} rows={2}
            placeholder="随便记点什么..."
            className="w-full rounded-md border border-slate-300 px-3 py-2" />
        </div>

        {/* 展开更多字段 */}
        {showMore && (
          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
            <div>
              <label className="mb-1 block text-xs text-slate-500">微信</label>
              <input type="text" value={wechat} onChange={(e) => setWechat(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-500">地区</label>
              <input type="text" value={region} onChange={(e) => setRegion(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-500">来源</label>
              <input type="text" value={source} onChange={(e) => setSource(e.target.value)} placeholder="展会/网络/转介绍" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
            </div>
          </div>
        )}
      </div>

      <div className="mt-5 flex items-center gap-2">
        <button type="submit" disabled={submitting || !isValid}
          className="rounded-md bg-teal-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50">
          {submitting ? "保存中..." : isEditing ? "保存" : "创建线索"}
        </button>
        <button type="button" onClick={() => router.back()}
          className="rounded-md border px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50">取消</button>
        <button type="button" onClick={() => setShowMore(!showMore)}
          className="ml-auto text-xs text-slate-400 hover:text-slate-600">
          {showMore ? "收起" : "更多字段..."}
        </button>
      </div>
    </form>
  );
}
