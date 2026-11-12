import { NextResponse } from "next/server";
import { requireExportSession } from "@/lib/export/auth";
import { canAssignExportWork } from "@/lib/export/lead-pool";
import { loadManagerInsights } from "@/lib/export/load-manager-insights";

export async function GET() {
  const { user, ctx, error } = await requireExportSession();
  if (error) return error;
  if (!canAssignExportWork(user!)) {
    return NextResponse.json({ error: "只有管理者可以查看经营分析" }, { status: 403 });
  }
  const data = await loadManagerInsights(ctx!.tenantId);
  return NextResponse.json({ data });
}
