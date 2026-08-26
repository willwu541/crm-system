"use client";

import Link from "next/link";
import { listHref } from "@/lib/export/list-filter-storage";

export function ListBackLink({
  listPath,
  className,
  children,
}: {
  listPath: string;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <Link href={listHref(listPath)} className={className}>
      {children ?? "返回"}
    </Link>
  );
}
