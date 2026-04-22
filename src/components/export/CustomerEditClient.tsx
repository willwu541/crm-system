"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CustomerForm } from "./CustomerForm";
import { parseResponseJson } from "@/lib/parse-response-json";

export function CustomerEditClient({ customerId }: { customerId: string }) {
  const [customer, setCustomer] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/export/customers/${customerId}`);
        const json = await parseResponseJson<{ data?: Record<string, unknown> }>(res);
        if (!cancelled && json.data) setCustomer(json.data);
      } catch {
        if (!cancelled) setCustomer(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [customerId]);

  if (loading) return <div className="p-8 text-center text-slate-500">加载中...</div>;
  if (!customer) return <div className="p-8 text-center text-slate-500">客户不存在</div>;

  return (
    <div>
      <h1 className="mb-6 text-xl font-semibold text-slate-800">编辑客户</h1>
      <CustomerForm initial={customer} customerId={customerId} />
    </div>
  );
}
