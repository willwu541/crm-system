"use client";

import Link from "next/link";

export interface ElsewhereHit {
  entityType: "customer" | "lead";
  id: string;
  companyName: string;
  ownerName: string;
  href: string;
}

export function ElsewhereHits({
  keyword,
  hits,
  current,
}: {
  keyword: string;
  hits: ElsewhereHit[];
  current: "customer" | "lead";
}) {
  if (!keyword || hits.length === 0) return null;
  const other = current === "customer" ? "线索" : "客户";
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      <p className="font-medium">当前列表没搜到「{keyword}」，但系统里有这些记录：</p>
      <ul className="mt-2 space-y-1">
        {hits.map((h) => (
          <li key={`${h.entityType}-${h.id}`}>
            <Link href={h.href} className="font-medium text-teal-700 hover:underline">
              {h.entityType === "lead" ? "线索" : "客户"} · {h.companyName}
            </Link>
            <span className="text-amber-800">（负责人：{h.ownerName}）</span>
          </li>
        ))}
      </ul>
      {hits.some((h) => h.entityType !== current) && (
        <p className="mt-1 text-xs text-amber-700">
          有的在{other}里，不在当前这个列表。
        </p>
      )}
    </div>
  );
}
