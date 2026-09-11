"use client";

import { useEffect, useState } from "react";
import { parseResponseJson } from "@/lib/parse-response-json";

export interface FillWhatsappTarget {
  kind: "lead" | "customer";
  id: string;
  companyName: string;
  contactId?: string | null;
  contactName?: string | null;
}

interface FillWhatsappModalProps {
  target: FillWhatsappTarget | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function FillWhatsappModal({ target, onClose, onSuccess }: FillWhatsappModalProps) {
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (target) {
      setValue("");
      setError("");
    }
  }, [target]);

  if (!target) return null;
  const current = target;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const whatsapp = value.trim();
    if (!whatsapp) {
      setError("请填写 WhatsApp 号码");
      return;
    }
    setError("");
    setLoading(true);
    try {
      if (current.kind === "lead") {
        const res = await fetch(`/api/export/leads/${current.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ whatsapp }),
        });
        const json = await parseResponseJson<{ error?: string }>(res);
        if (!res.ok) throw new Error(json.error ?? "保存失败");
      } else if (current.contactId) {
        const res = await fetch(`/api/export/contacts/${current.contactId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ whatsapp }),
        });
        const json = await parseResponseJson<{ error?: string }>(res);
        if (!res.ok) throw new Error(json.error ?? "保存失败");
      } else {
        const res = await fetch("/api/export/contacts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            customerId: current.id,
            name: current.contactName?.trim() || current.companyName,
            whatsapp,
            isPrimary: true,
          }),
        });
        const json = await parseResponseJson<{ error?: string }>(res);
        if (!res.ok) throw new Error(json.error ?? "保存失败");
      }
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-4 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-1 font-medium text-slate-800">补填 WhatsApp</h3>
        <p className="mb-4 text-sm text-slate-500">{target.companyName}</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>
          )}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">WhatsApp 号码</label>
            <input
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="如 +1 555 0100"
              autoFocus
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-md bg-green-700 px-4 py-2 text-sm text-white hover:bg-green-800 disabled:opacity-50"
            >
              {loading ? "保存中..." : "保存"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
