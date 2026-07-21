"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useToast } from "@/components/ui/Toast";
import { parseResponseJson } from "@/lib/parse-response-json";
import { PRODUCT_TYPES, SPEC_MODELS, MATERIALS, PRODUCT_UNITS } from "@/lib/domestic/steel-grating-constants";

interface CustomerOption { id: string; name: string; contactName: string; contactPhone: string; }

export function QuoteForm() {
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedCustomerId = searchParams.get("customerId");

  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [customerId, setCustomerId] = useState(preselectedCustomerId || "");
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [projectName, setProjectName] = useState("");
  const [deliveryRegion, setDeliveryRegion] = useState("");
  const [includeTax, setIncludeTax] = useState(true);
  const [includeShipping, setIncludeShipping] = useState(false);
  const [paymentTerm, setPaymentTerm] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [remark, setRemark] = useState("");
  const [items, setItems] = useState([{ productType: "钢格板", specModel: "", material: "", dimensions: "", quantity: 1, unit: "平方米", unitPrice: 0, amount: 0, theoryWeight: 0, actualWeight: 0, remark: "" }]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/customers?pageSize=200").then(r => r.json()).then(j => {
      if (j.data) setCustomers(j.data);
    });
  }, []);

  useEffect(() => {
    if (customerId && customers.length > 0) {
      const c = customers.find(c => c.id === customerId);
      if (c) { setContactName(c.contactName); setContactPhone(c.contactPhone); }
    }
  }, [customerId, customers]);

  function addItem() {
    setItems([...items, { productType: "钢格板", specModel: "", material: "", dimensions: "", quantity: 1, unit: "平方米", unitPrice: 0, amount: 0, theoryWeight: 0, actualWeight: 0, remark: "" }]);
  }

  function removeItem(idx: number) {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== idx));
  }

  function updateItem(idx: number, field: string, value: string | number) {
    const newItems = [...items];
    (newItems[idx] as Record<string, unknown>)[field] = value;
    if (field === "quantity" || field === "unitPrice") {
      const q = field === "quantity" ? Number(value) : newItems[idx].quantity;
      const p = field === "unitPrice" ? Number(value) : newItems[idx].unitPrice;
      newItems[idx].amount = Math.round(q * p * 100) / 100;
    }
    setItems(newItems);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!customerId) { setError("请选择客户"); return; }
    const hasInvalidItem = items.some(it => !it.specModel.trim() || it.unitPrice <= 0);
    if (hasInvalidItem) { setError("请填写规格型号和单价（必须大于0）"); return; }

    setSubmitting(true);
    try {
      const res = await fetch("/api/customer-quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId, contactName, contactPhone, projectName: projectName || undefined, deliveryRegion: deliveryRegion || undefined, includeTax, includeShipping, paymentTerm: paymentTerm || undefined, validUntil: validUntil || undefined, remark: remark || undefined, items: items.map(it => ({ ...it, theoryWeight: it.theoryWeight || undefined, actualWeight: it.actualWeight || undefined })) }),
      });
      const json = await parseResponseJson<{ error?: string; data?: { id: string } }>(res);
      if (!res.ok) throw new Error(json.error ?? "创建失败");
      toast("报价创建成功");
      router.push("/quotes");
    } catch (e) {
      setError(e instanceof Error ? e.message : "创建失败");
    } finally { setSubmitting(false); }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl">
      {error && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}
      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="mb-4 font-semibold text-slate-700">基本信息</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium">客户 *</label>
            <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} required className="w-full rounded-md border border-slate-300 px-3 py-2">
              <option value="">选择客户</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">项目名称</label>
            <input type="text" value={projectName} onChange={(e) => setProjectName(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2" />
          </div>
          <div><label className="mb-1 block text-sm font-medium">联系人</label><input type="text" value={contactName} onChange={(e) => setContactName(e.target.value)} required className="w-full rounded-md border border-slate-300 px-3 py-2" /></div>
          <div><label className="mb-1 block text-sm font-medium">电话</label><input type="text" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} required className="w-full rounded-md border border-slate-300 px-3 py-2" /></div>
          <div><label className="mb-1 block text-sm font-medium">交货地区</label><input type="text" value={deliveryRegion} onChange={(e) => setDeliveryRegion(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2" /></div>
          <div><label className="mb-1 block text-sm font-medium">付款方式</label><input type="text" value={paymentTerm} onChange={(e) => setPaymentTerm(e.target.value)} placeholder="如：预付30%+发货前70%" className="w-full rounded-md border border-slate-300 px-3 py-2" /></div>
          <div><label className="mb-1 block text-sm font-medium">有效期至</label><input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2" /></div>
          <div className="flex items-end gap-4 pb-2">
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={includeTax} onChange={(e) => setIncludeTax(e.target.checked)} />含税</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={includeShipping} onChange={(e) => setIncludeShipping(e.target.checked)} />含运费</label>
          </div>
          <div className="sm:col-span-2"><label className="mb-1 block text-sm font-medium">备注</label><textarea value={remark} onChange={(e) => setRemark(e.target.value)} rows={2} className="w-full rounded-md border border-slate-300 px-3 py-2" /></div>
        </div>
      </div>

      {/* 明细行 */}
      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold text-slate-700">产品明细</h2>
          <button type="button" onClick={addItem} className="rounded-md border border-teal-300 px-3 py-1 text-sm text-teal-700 hover:bg-teal-50">+ 添加行</button>
        </div>
        {items.map((it, idx) => (
          <div key={idx} className="grid gap-2 sm:grid-cols-8 mb-3 p-3 bg-slate-50 rounded-md">
            <div className="sm:col-span-1"><label className="text-xs">类型</label>
              <select value={it.productType} onChange={(e) => updateItem(idx, "productType", e.target.value)} className="w-full rounded border border-slate-300 px-2 py-1 text-sm">
                {PRODUCT_TYPES.map(pt => <option key={pt} value={pt}>{pt}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2"><label className="text-xs">规格型号</label>
              <select value={it.specModel} onChange={(e) => updateItem(idx, "specModel", e.target.value)} className="w-full rounded border border-slate-300 px-2 py-1 text-sm">
                <option value="">自定义</option>
                {SPEC_MODELS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <input type="text" value={it.specModel} onChange={(e) => updateItem(idx, "specModel", e.target.value)} placeholder="或手动输入规格" className="w-full rounded border border-slate-300 px-2 py-1 text-sm mt-1" />
            </div>
            <div className="sm:col-span-1"><label className="text-xs">材质</label>
              <select value={it.material} onChange={(e) => updateItem(idx, "material", e.target.value)} className="w-full rounded border border-slate-300 px-2 py-1 text-sm">
                <option value="">选择材质</option>
                {MATERIALS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div className="sm:col-span-1"><label className="text-xs">尺寸</label><input type="text" value={it.dimensions} onChange={(e) => updateItem(idx, "dimensions", e.target.value)} className="w-full rounded border border-slate-300 px-2 py-1 text-sm" /></div>
            <div className="sm:col-span-1"><label className="text-xs">数量</label><input type="number" value={it.quantity} onChange={(e) => updateItem(idx, "quantity", parseFloat(e.target.value) || 0)} min="0" step="0.01" className="w-full rounded border border-slate-300 px-2 py-1 text-sm" /></div>
            <div><label className="text-xs">单位</label>
              <select value={it.unit} onChange={(e) => updateItem(idx, "unit", e.target.value)} className="w-full rounded border border-slate-300 px-2 py-1 text-sm">
                {PRODUCT_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div><label className="text-xs">单价(¥)</label><input type="number" value={it.unitPrice} onChange={(e) => updateItem(idx, "unitPrice", parseFloat(e.target.value) || 0)} min="0" step="0.01" className="w-full rounded border border-slate-300 px-2 py-1 text-sm" /></div>
            <div><label className="text-xs">金额(¥)</label><div className="w-full rounded border border-slate-200 bg-slate-100 px-2 py-1 text-sm">{it.amount.toLocaleString()}</div></div>
            <div className="sm:col-span-1"><label className="text-xs">理论吨(t)</label><input type="number" value={it.theoryWeight} onChange={(e) => updateItem(idx, "theoryWeight", parseFloat(e.target.value) || 0)} min="0" step="0.001" className="w-full rounded border border-slate-300 px-2 py-1 text-sm" /></div>
            <div className="sm:col-span-1"><label className="text-xs">过泵吨(t)</label><input type="number" value={it.actualWeight} onChange={(e) => updateItem(idx, "actualWeight", parseFloat(e.target.value) || 0)} min="0" step="0.001" className="w-full rounded border border-slate-300 px-2 py-1 text-sm" /></div>
            <div><button type="button" onClick={() => removeItem(idx)} className="text-red-500 text-xs hover:underline mt-4">删除</button></div>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <button type="submit" disabled={submitting} className="rounded-md bg-teal-600 px-6 py-2 text-sm text-white hover:bg-teal-700 disabled:opacity-50">{submitting ? "保存中..." : "创建报价"}</button>
        <button type="button" onClick={() => router.back()} className="rounded-md border border-slate-300 px-6 py-2 text-sm hover:bg-slate-50">取消</button>
      </div>
    </form>
  );
}
