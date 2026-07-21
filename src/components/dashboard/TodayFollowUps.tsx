"use client";

import { useState } from "react";
import Link from "next/link";
import { useToast } from "@/components/ui/Toast";

interface FollowUpItem {
  id: string;
  name: string;
  contactName: string;
  contactPhone: string;
  nextFollowUpAt: string | null;
  isInPool: boolean;
}

export function TodayFollowUps({ data }: { data: FollowUpItem[] }) {
  const { toast } = useToast();
  const [items, setItems] = useState(data);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());

  async function quickFollow(id: string, name: string) {
    setFollowingIds(prev => new Set([...prev, id]));
    try {
      const res = await fetch(`/api/customers/${id}/quick-follow`, { method: "POST" });
      if (!res.ok) throw new Error("操作失败");
      toast(`已跟进: ${name}`);
      setItems(prev => prev.filter(c => c.id !== id));
    } catch (e) {
      toast(e instanceof Error ? e.message : "操作失败");
    } finally {
      setFollowingIds(prev => { const n = new Set(prev); n.delete(id); return n; });
    }
  }

  if (items.length === 0) {
    return <p className="text-sm text-slate-400">今天没有需要跟进的客户，干得漂亮！</p>;
  }

  return (
    <div className="divide-y divide-slate-100">
      {items.map((c) => (
        <div key={c.id} className="flex items-center justify-between py-2.5">
          <div className="flex items-center gap-3 min-w-0">
            <Link href={`/customers/${c.id}`} className="font-medium text-sm text-teal-700 hover:underline truncate">{c.name}</Link>
            <span className="text-xs text-slate-500 hidden sm:inline">{c.contactName} · {c.contactPhone}</span>
            {c.isInPool && <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-700 flex-shrink-0">公海</span>}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {c.nextFollowUpAt && <span className="text-xs text-slate-400 hidden sm:inline">应跟进：{new Date(c.nextFollowUpAt).toLocaleDateString("zh-CN")}</span>}
            <button
              onClick={() => quickFollow(c.id, c.name)}
              disabled={followingIds.has(c.id)}
              className="rounded bg-emerald-100 px-2.5 py-1 text-xs text-emerald-700 hover:bg-emerald-200 disabled:opacity-50"
            >
              {followingIds.has(c.id) ? "..." : "已跟进"}
            </button>
            <Link href={`/customers/${c.id}`} className="text-xs text-teal-600 hover:underline flex-shrink-0">详情 →</Link>
          </div>
        </div>
      ))}
    </div>
  );
}
