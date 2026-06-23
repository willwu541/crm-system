"use client";

interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ page, totalPages, total, onPageChange }: PaginationProps) {
  if (total <= 0) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 pb-2">
      <span className="text-sm text-slate-600">共 {total} 条</span>
      {totalPages > 1 && (
        <div className="flex gap-2">
          <button
            onClick={() => onPageChange(Math.max(1, page - 1))}
            disabled={page <= 1}
            className="rounded border border-slate-300 px-3 py-1 text-sm disabled:opacity-50 hover:bg-slate-50"
          >
            上一页
          </button>
          <span className="py-1 text-sm text-slate-600">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages}
            className="rounded border border-slate-300 px-3 py-1 text-sm disabled:opacity-50 hover:bg-slate-50"
          >
            下一页
          </button>
        </div>
      )}
    </div>
  );
}
