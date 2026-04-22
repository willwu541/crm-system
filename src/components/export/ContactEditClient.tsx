"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ContactFormClient } from "./ContactFormClient";
import { parseResponseJson } from "@/lib/parse-response-json";

export function ContactEditClient({ customerId, contactId }: { customerId: string; contactId: string }) {
  const [contact, setContact] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/export/contacts/${contactId}`);
        const json = await parseResponseJson<{ data?: Record<string, unknown> }>(res);
        if (!cancelled && json.data) setContact(json.data);
      } catch {
        if (!cancelled) setContact(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [contactId]);

  if (loading) return <div className="p-8 text-center text-slate-500">加载中...</div>;
  if (!contact) return <div className="p-8 text-center text-slate-500">联系人不存在</div>;

  return (
    <div>
      <h1 className="mb-6 text-xl font-semibold text-slate-800">编辑联系人</h1>
      <ContactFormClient customerId={customerId} initial={contact} contactId={contactId} />
    </div>
  );
}
