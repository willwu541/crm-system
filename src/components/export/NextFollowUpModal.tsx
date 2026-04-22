"use client";

import { useState, useEffect } from "react";
import { parseResponseJson } from "@/lib/parse-response-json";

interface NextFollowUpModalProps {
  open: boolean;
  customerId: string;
  customerName: string;
  currentNextFollowUpAt: string | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function NextFollowUpModal({
  open,
  customerId,
  customerName,
  currentNextFollowUpAt,
  onClose,
  onSuccess,
}: NextFollowUpModalProps) {
  const [date, setDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      const defaultDate = currentNextFollowUpAt
        ? new Date(currentNextFollowUpAt).toISOString().slice(0, 16)
        : new Date().toISOString().slice(0, 16);
      setDate(defaultDate);
      setError("");
    }
  }, [open, currentNextFollowUpAt]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`/api/export/customers/${customerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nextFollowUpAt: date ? new Date(date).toISOString() : null,
        }),
      });
      const json = await parseResponseJson<{ error?: string }>(res);
      if (!res.ok) throw new Error(json.error ?? "设置失败");
      onSuccess();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "设置失败");
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-4 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-3 font-medium text-slate-800">设置下次跟进</h3>
        <p className="mb-4 text-sm text-slate-500">{customerName}</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>
          )}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">下次跟进时间</label>
            <input
              type="datetime-local"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loading}
              className="rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
            >
              {loading ? "设置中..." : "确定"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50"
            >
              取消
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
