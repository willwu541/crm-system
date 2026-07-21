"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";
import { parseResponseJson } from "@/lib/parse-response-json";

interface Props {
  customerId: string;
  customerName: string;
  isInPool: boolean;
  isDealLost: boolean;
}

export function CustomerPoolActions({ customerId, customerName, isInPool, isDealLost }: Props) {
  const { toast } = useToast();
  const router = useRouter();
  const [releasing, setReleasing] = useState(false);
  const [markingLost, setMarkingLost] = useState(false);
  const [showLostModal, setShowLostModal] = useState(false);
  const [lostReason, setLostReason] = useState("");

  async function handleReleaseToPool() {
    if (!confirm(`确认将"${customerName}"释放到公海？其他业务员可以看到并认领。`)) return;
    setReleasing(true);
    try {
      const res = await fetch(`/api/customers/${customerId}/pool-actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "release_to_pool", reason: "" }),
      });
      const json = await parseResponseJson<{ error?: string }>(res);
      if (!res.ok) throw new Error(json.error ?? "释放失败");
      toast(`"${customerName}"已释放到公海`);
      router.refresh();
    } catch (e) {
      toast(e instanceof Error ? e.message : "释放失败");
    } finally {
      setReleasing(false);
    }
  }

  async function handleMarkLost() {
    if (!lostReason.trim()) {
      toast("请填写跑单原因");
      return;
    }
    setMarkingLost(true);
    try {
      const res = await fetch(`/api/customers/${customerId}/pool-actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "mark_lost", reason: lostReason.trim() }),
      });
      const json = await parseResponseJson<{ error?: string }>(res);
      if (!res.ok) throw new Error(json.error ?? "操作失败");
      toast(`"${customerName}"已标记为跑单，进入公海`);
      setShowLostModal(false);
      router.refresh();
    } catch (e) {
      toast(e instanceof Error ? e.message : "操作失败");
    } finally {
      setMarkingLost(false);
    }
  }

  // 已在公海
  if (isInPool) {
    return (
      <span className="rounded bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800">
        {isDealLost ? `跑单` : `公海中`}
      </span>
    );
  }

  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={handleReleaseToPool}
        disabled={releasing}
        className="rounded-md border border-amber-300 bg-amber-50 px-3 py-1.5 text-sm text-amber-800 hover:bg-amber-100 disabled:opacity-50"
      >
        {releasing ? "释放中..." : "释放到公海"}
      </button>
      <button
        type="button"
        onClick={() => setShowLostModal(true)}
        className="rounded-md border border-red-300 bg-red-50 px-3 py-1.5 text-sm text-red-700 hover:bg-red-100"
      >
        标记跑单
      </button>

      {/* 跑单原因弹窗 */}
      {showLostModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => setShowLostModal(false)} aria-hidden />
          <div className="relative w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-xl">
            <h3 className="mb-4 text-lg font-semibold text-slate-800">确认跑单</h3>
            <p className="mb-3 text-sm text-slate-600">
              将客户 <strong>{customerName}</strong> 标记为跑单，该客户将进入公海。
            </p>
            <label className="mb-1 block text-sm font-medium">跑单原因</label>
            <select
              value={lostReason}
              onChange={(e) => setLostReason(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 mb-4"
            >
              <option value="">请选择原因</option>
              <option value="价格不合适">价格不合适</option>
              <option value="选了竞品">选了竞品</option>
              <option value="项目取消">项目取消</option>
              <option value="客户无需求">客户无需求</option>
              <option value="联系不上">联系不上</option>
              <option value="付款问题">付款问题</option>
              <option value="其他">其他</option>
            </select>
            {lostReason === "其他" && (
              <input
                type="text"
                placeholder="请输入具体原因"
                className="w-full rounded-md border border-slate-300 px-3 py-2 mb-4"
                onChange={(e) => setLostReason(e.target.value)}
              />
            )}
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowLostModal(false)} className="rounded-md border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50">取消</button>
              <button onClick={handleMarkLost} disabled={markingLost} className="rounded-md bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700 disabled:opacity-50">
                {markingLost ? "处理中..." : "确认跑单"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
