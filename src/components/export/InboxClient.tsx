"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { parseResponseJson } from "@/lib/parse-response-json";
import { activityDirectionLabel, activityTypeLabel } from "@/lib/export-display-labels";

interface InboxItem {
  id: string;
  direction: string;
  type: string;
  subject: string | null;
  content: string | null;
  customerNameSnapshot: string | null;
  contactNameSnapshot: string | null;
  createdAt: string;
  owner: { id: string; name: string };
  customer: { id: string; companyName: string } | null;
  lead: { id: string; companyName: string } | null;
}

export function InboxClient() {
  const [items, setItems] = useState<InboxItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [direction, setDirection] = useState("");
  const [type, setType] = useState("");
  const [keyword, setKeyword] = useState("");

  async function fetchInbox() {
    setLoading(true);
    const params = new URLSearchParams();
    if (direction) params.set("direction", direction);
    if (type) params.set("type", type);
    if (keyword.trim()) params.set("keyword", keyword.trim());
    const res = await fetch(`/api/export/inbox?${params}`);
    const json = await parseResponseJson<{ data?: InboxItem[] }>(res);
    setItems(json.data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    fetchInbox();
  }, []);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
        <h1 className="text-lg font-semibold text-slate-800">统一收件箱</h1>
        <p className="text-xs text-slate-500">汇总邮件/社媒跟进记录，快速回溯沟通上下文</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <select
            value={direction}
            onChange={(e) => setDirection(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">全部方向</option>
            <option value="inbound">客户回复</option>
            <option value="outbound">我方发出</option>
          </select>
          <input
            value={type}
            onChange={(e) => setType(e.target.value)}
            placeholder="类型（email/whatsapp/...）"
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="搜索主题/内容/公司"
            className="min-w-[220px] rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={fetchInbox}
            className="rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
          >
            筛选
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200/80 bg-white shadow-sm">
        {loading ? (
          <div className="p-10 text-center text-slate-500">加载中...</div>
        ) : items.length === 0 ? (
          <div className="p-10 text-center text-slate-500">暂无沟通记录</div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {items.map((i) => (
              <li key={i.id} className="p-4">
                <div className="mb-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span className="rounded bg-slate-100 px-2 py-0.5">
                    {activityDirectionLabel[i.direction] ?? i.direction}
                  </span>
                  <span className="rounded bg-slate-100 px-2 py-0.5">
                    {activityTypeLabel[i.type] ?? i.type}
                  </span>
                  <span>{i.owner.name}</span>
                  <span>{new Date(i.createdAt).toLocaleString("zh-CN")}</span>
                </div>
                <p className="font-medium text-slate-800">{i.subject || "（无主题）"}</p>
                {i.content && (
                  <p className="mt-1 line-clamp-2 text-sm text-slate-600">{i.content}</p>
                )}
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span>公司：{i.customerNameSnapshot || i.customer?.companyName || i.lead?.companyName || "-"}</span>
                  {i.contactNameSnapshot && <span>联系人：{i.contactNameSnapshot}</span>}
                  {i.customer && (
                    <Link href={`/export/customers/${i.customer.id}`} className="text-teal-700 hover:underline">
                      客户详情
                    </Link>
                  )}
                  {i.lead && (
                    <Link href={`/export/leads/${i.lead.id}`} className="text-teal-700 hover:underline">
                      线索详情
                    </Link>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

