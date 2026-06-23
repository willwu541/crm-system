"use client";

import { useState } from "react";
import { CUSTOMER_STATUSES } from "@/lib/export-constants";
import { customerStatusLabel } from "@/lib/export-display-labels";

export interface ConvertLeadPayload {
  customerStatus?: string;
  nextFollowUpAt?: string;
  createTaskTitle?: string;
  createTaskDueAt?: string;
}

export function ConvertLeadModal({
  open,
  companyName,
  loading,
  onClose,
  onSubmit,
}: {
  open: boolean;
  companyName: string;
  loading?: boolean;
  onClose: () => void;
  onSubmit: (payload: ConvertLeadPayload) => Promise<void> | void;
}) {
  const [customerStatus, setCustomerStatus] = useState("to_develop");
  const [nextFollowUpAt, setNextFollowUpAt] = useState("");
  const [createTaskTitle, setCreateTaskTitle] = useState("转化后首轮跟进");
  const [createTaskDueAt, setCreateTaskDueAt] = useState("");

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50" onClick={onClose} aria-hidden />
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          await onSubmit({
            customerStatus,
            nextFollowUpAt: nextFollowUpAt || undefined,
            createTaskTitle: createTaskTitle || undefined,
            createTaskDueAt: createTaskDueAt || undefined,
          });
        }}
        className="relative w-full max-w-xl rounded-lg bg-white p-6 shadow-xl"
      >
        <h2 className="text-lg font-semibold text-slate-800">转化线索为客户</h2>
        <p className="mt-1 text-sm text-slate-500">
          将「{companyName}」转为客户，并同步设置跟进计划。
        </p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">客户阶段</label>
            <select
              value={customerStatus}
              onChange={(e) => setCustomerStatus(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2"
            >
              {CUSTOMER_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {customerStatusLabel[s] ?? s}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">下次跟进时间（可选）</label>
            <input
              type="datetime-local"
              value={nextFollowUpAt}
              onChange={(e) => setNextFollowUpAt(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium text-slate-700">自动创建首个任务（可选）</label>
            <input
              type="text"
              value={createTaskTitle}
              onChange={(e) => setCreateTaskTitle(e.target.value)}
              placeholder="如：发送公司介绍+产品目录"
              className="w-full rounded-md border border-slate-300 px-3 py-2"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium text-slate-700">任务截止时间（可选）</label>
            <input
              type="datetime-local"
              value={createTaskDueAt}
              onChange={(e) => setCreateTaskDueAt(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2"
            />
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50"
          >
            取消
          </button>
          <button
            type="submit"
            disabled={loading}
            className="rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
          >
            {loading ? "转化中..." : "确认转化"}
          </button>
        </div>
      </form>
    </div>
  );
}

