"use client";

import Link from "next/link";

export function ConvertOnboardModal({
  open,
  customerId,
  companyName,
  onClose,
  onSetFollowUp,
}: {
  open: boolean;
  customerId: string;
  companyName: string;
  onClose: () => void;
  onSetFollowUp: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50" onClick={onClose} aria-hidden />
      <div className="relative w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-slate-800">转化成功</h2>
        <p className="mt-2 text-sm text-slate-600">
          「{companyName}」已转为客户，沟通记录已迁移。建议完成以下步骤：
        </p>
        <ul className="mt-3 list-inside list-disc space-y-1 text-sm text-slate-600">
          <li>确认主联系人与社媒账号</li>
          <li>设置下次跟进日期</li>
          <li>在客户页继续报价/任务跟进</li>
        </ul>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link
            href={`/export/customers/${customerId}`}
            className="rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
          >
            打开客户详情
          </Link>
          <button
            type="button"
            onClick={onSetFollowUp}
            className="rounded-md border border-teal-300 bg-teal-50 px-4 py-2 text-sm text-teal-800 hover:bg-teal-100"
          >
            设置下次跟进
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50"
          >
            稍后处理
          </button>
        </div>
      </div>
    </div>
  );
}
