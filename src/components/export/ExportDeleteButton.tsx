"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useToast } from "@/components/ui/Toast";
import { parseResponseJson } from "@/lib/parse-response-json";

type Props = {
  apiPath: string;
  redirectTo?: string;
  onDeleted?: () => void;
  label?: string;
  className?: string;
};

export function ExportDeleteButton({
  apiPath,
  redirectTo,
  onDeleted,
  label = "删除",
  className = "rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700 hover:bg-red-100 disabled:opacity-50",
}: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [deleting, setDeleting] = useState(false);

  async function onClick() {
    if (
      !confirm(
        "确定要删除吗？删除后可在内贸后台「用户管理」旁的「外贸删除记录」中查看删除前完整数据快照。"
      )
    )
      return;
    setDeleting(true);
    try {
      const res = await fetch(apiPath, { method: "DELETE" });
      const json = await parseResponseJson<{ error?: string }>(res);
      if (!res.ok) throw new Error(json.error ?? "删除失败");
      toast("已删除");
      if (onDeleted) onDeleted();
      else if (redirectTo) router.push(redirectTo);
    } catch (e) {
      toast(e instanceof Error ? e.message : "删除失败", "error");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <button type="button" onClick={onClick} disabled={deleting} className={className}>
      {deleting ? "删除中..." : label}
    </button>
  );
}
