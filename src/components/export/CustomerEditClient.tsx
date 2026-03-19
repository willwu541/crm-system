"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CustomerForm } from "./CustomerForm";

export function CustomerEditClient({ customerId }: { customerId: string }) {
  const [customer, setCustomer] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/export/customers/${customerId}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.data) setCustomer(json.data);
      })
      .finally(() => setLoading(false));
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
