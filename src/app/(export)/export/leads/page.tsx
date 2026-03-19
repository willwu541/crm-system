import { LeadsClient } from "@/components/export/LeadsClient";

export default function ExportLeadsPage() {
  return (
    <div>
      <h1 className="mb-6 text-xl font-semibold text-slate-800">Leads 线索</h1>
      <LeadsClient />
    </div>
  );
}
