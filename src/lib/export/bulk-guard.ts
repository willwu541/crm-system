import { NextResponse } from "next/server";
import type { SessionUser } from "@/lib/auth";
import { isExportAdmin } from "@/lib/export/lead-pool";

export function denyBulkExport(user: Pick<SessionUser, "id" | "role"> | null | undefined) {
  if (user && isExportAdmin(user)) return null;
  return NextResponse.json(
    { error: "批量导出已关闭。请打开单条记录使用联系方式，避免把线索和客户整批带走。" },
    { status: 403 },
  );
}
