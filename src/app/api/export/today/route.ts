import { NextResponse } from "next/server";
import { requireExportSession } from "@/lib/export/auth";
import { canAssignExportWork } from "@/lib/export/lead-pool";
import { loadTodaySummary } from "@/lib/export/load-today-summary";

export async function GET() {
  const { user, ctx, error } = await requireExportSession();
  if (error) return error;
  if (!canAssignExportWork(user!)) {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }

  const data = await loadTodaySummary(ctx!.tenantId);
  return NextResponse.json({ data });
}
