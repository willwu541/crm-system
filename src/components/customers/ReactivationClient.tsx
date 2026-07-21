"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface ReactivationRow {
  id: string;
  name: string;
  contactName: string;
  contactPhone: string;
  wechat: string | null;
  status: string;
  lastContactAt: string | null;
  wakeUpCount: number;
  daysSilent: number;
  owner: { name: string };
  suggestion: {
    priority: string;
    message: string;
    channel: string;
  };
}

export function ReactivationClient({
  initialData,
  dormantDays,
}: {
  initialData: ReactivationRow[];
  dormantDays: number;
}) {
  const router = useRouter();
  const [days, setDays] = useState(dormantDays);
  const [rows, setRows] = useState(initialData);
  const [loading, setLoading] = useState(false);
  const [actingId, setActingId] = useState<string | null>(null);
  const [note, setNote] = useState<Record<string, string>>({});

  async function reload() {
    setLoading(true);
    try {
      const res = await fetch(`/api/customers/reactivation?days=${days}&pageSize=50`);
      const json = await res.json();
      if (res.ok) setRows(json.data);
    } finally {
      setLoading(false);
    }
  }

  async function wakeUp(customer: ReactivationRow) {
    setActingId(customer.id);
    try {
      const res = await fetch(`/api/customers/${customer.id}/wake-up`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          note: note[customer.id] || undefined,
          channel: customer.suggestion.channel,
        }),
      });
      if (res.ok) {
        setRows((list) => list.filter((r) => r.id !== customer.id));
        router.refresh();
      }
    } finally {
      setActingId(null);
    }
  }

  const priorityStyle: Record<string, string> = {
    high: "bg-red-50 text-red-700",
    medium: "bg-amber-50 text-amber-800",
    low: "bg-slate-100 text-slate-600",
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        私域唤醒：识别超过指定天数未联系的客户，通过微信/电话等私域渠道重新触达，提升复购与转介绍机会。
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm text-slate-600">
          沉默天数 ≥
          <input
            type="number"
            min={7}
            value={days}
            onChange={(e) => setDays(Number(e.target.value) || 30)}
            className="mx-2 w-20 rounded-md border border-slate-300 px-2 py-1 text-sm"
          />
          天
        </label>
        <button
          type="button"
          onClick={reload}
          disabled={loading}
          className="rounded-md bg-teal-600 px-4 py-2 text-sm text-white hover:bg-teal-700 disabled:opacity-50"
        >
          {loading ? "加载中..." : "刷新列表"}
        </button>
        <Link href="/customers" className="text-sm text-teal-600 hover:underline">
          返回客户列表
        </Link>
      </div>

      <div className="space-y-4">
        {rows.length === 0 ? (
          <div className="rounded-lg border border-slate-200 bg-white px-6 py-10 text-center text-slate-500">
            当前条件下暂无需要唤醒的客户
          </div>
        ) : (
          rows.map((c) => (
            <div key={c.id} className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Link href={`/customers/${c.id}`} className="text-lg font-medium text-slate-800 hover:text-teal-600">
                      {c.name}
                    </Link>
                    <span className={`rounded px-2 py-0.5 text-xs ${priorityStyle[c.suggestion.priority] ?? priorityStyle.low}`}>
                      {c.suggestion.priority === "high" ? "高优先" : c.suggestion.priority === "medium" ? "中优先" : "低优先"}
                    </span>
                  </div>
                  <div className="mt-1 text-sm text-slate-600">
                    {c.contactName} · {c.contactPhone}
                    {c.wechat ? ` · 微信：${c.wechat}` : " · 无微信"}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    已沉默 {c.daysSilent} 天 · 历史唤醒 {c.wakeUpCount} 次 · 负责人 {c.owner.name}
                  </div>
                </div>
              </div>

              <p className="mt-3 text-sm text-slate-700">{c.suggestion.message}</p>

              <div className="mt-3 flex flex-wrap gap-2">
                <input
                  value={note[c.id] ?? ""}
                  onChange={(e) => setNote((n) => ({ ...n, [c.id]: e.target.value }))}
                  placeholder="唤醒备注（可选，如：已发案例图/已电话沟通）"
                  className="min-w-[240px] flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
                <button
                  type="button"
                  disabled={actingId === c.id}
                  onClick={() => wakeUp(c)}
                  className="rounded-md bg-amber-600 px-4 py-2 text-sm text-white hover:bg-amber-700 disabled:opacity-50"
                >
                  {actingId === c.id ? "处理中..." : "标记已唤醒"}
                </button>
                <Link
                  href={`/customers/${c.id}`}
                  className="rounded-md border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50"
                >
                  查看详情
                </Link>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
