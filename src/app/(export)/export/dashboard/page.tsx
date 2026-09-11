import { DailyWorkBoard } from "@/components/export/DailyWorkBoard";
import { ExportDashboardClient } from "./ExportDashboardClient";

export default function ExportDashboardPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-slate-800">工作台</h1>
      <DailyWorkBoard />
      <ExportDashboardClient />
    </div>
  );
}
