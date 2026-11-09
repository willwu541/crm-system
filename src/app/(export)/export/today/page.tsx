import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { canAssignExportWork } from "@/lib/export/lead-pool";
import { TodaySummary } from "@/components/export/TodaySummary";

export default async function ExportTodayPage() {
  const user = await getSession();
  if (!user) redirect("/login?redirect=" + encodeURIComponent("/export/today"));
  if (!canAssignExportWork(user)) {
    redirect(user.tenant === "export" ? "/export/dashboard" : "/dashboard");
  }
  return <TodaySummary />;
}
