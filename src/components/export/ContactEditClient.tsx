"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ContactFormClient } from "./ContactFormClient";

export function ContactEditClient({ customerId, contactId }: { customerId: string; contactId: string }) {
  const [contact, setContact] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/export/contacts/${contactId}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.data) setContact(json.data);
      })
      .finally(() => setLoading(false));
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
