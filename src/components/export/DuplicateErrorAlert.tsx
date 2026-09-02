"use client";

import Link from "next/link";

export interface DuplicateRecord {
  entityType: "customer" | "lead";
  id: string;
  companyName: string;
  ownerName?: string;
  href: string;
}

export function DuplicateErrorAlert({
  error,
  duplicate,
}: {
  error: string;
  duplicate?: DuplicateRecord | null;
}) {
  const entityLabel = duplicate?.entityType === "lead" ? "线索" : "客户";
  return (
    <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
      <p>{error}</p>
      {duplicate?.href && (
        <Link href={duplicate.href} className="mt-1 inline-block font-medium text-teal-700 hover:underline">
          打开已有{entityLabel}「{duplicate.companyName}」
        </Link>
      )}
    </div>
  );
}
