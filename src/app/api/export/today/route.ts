import { NextRequest, NextResponse } from "next/server";
import { requireExportSession } from "@/lib/export/auth";
import { canAssignExportWork, startOfLocalDay } from "@/lib/export/lead-pool";
import { loadTodaySummary } from "@/lib/export/load-today-summary";
import { formatDayKey, parseSummaryDay, summaryLogDays } from "@/lib/export/today-summary";

export async function GET(request: NextRequest) {
  const { user, ctx, error } = await requireExportSession();
  if (error) return error;
  if (!canAssignExportWork(user!)) {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }

  const now = new Date();
  const day = parseSummaryDay(request.nextUrl.searchParams.get("date"), now);
  const summary = await loadTodaySummary(ctx!.tenantId, day);
  const today = formatDayKey(startOfLocalDay(now));
  return NextResponse.json({
    data: {
      ...summary,
      isToday: summary.date === today,
      today,
      days: summaryLogDays(now, 30, day),
    },
  });
}
