"use client";

interface StatusBadgeProps {
  status: string;
  variant?: "default" | "success" | "warning" | "error" | "muted";
  label?: string;
}

const VARIANT_CLASS: Record<string, string> = {
  success: "bg-green-50 text-green-700",
  warning: "bg-amber-50 text-amber-700",
  error: "bg-red-50 text-red-700",
  muted: "bg-slate-100 text-slate-500",
  default: "bg-slate-100 text-slate-600",
};

export function StatusBadge({ status, variant = "default", label }: StatusBadgeProps) {
  return (
    <span className={`inline-flex rounded px-2 py-0.5 text-xs ${VARIANT_CLASS[variant]}`}>
      {label ?? status}
    </span>
  );
}
