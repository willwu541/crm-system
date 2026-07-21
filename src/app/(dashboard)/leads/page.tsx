import { LeadListClient } from "@/components/leads/LeadListClient";

export default function LeadsPage() {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-slate-800">线索管理</h1>
      <LeadListClient />
    </div>
  );
}
