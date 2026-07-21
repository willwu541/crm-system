import { LeadDetailClient } from "@/components/leads/LeadDetailClient";

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-slate-800">线索详情</h1>
      <LeadDetailClient leadId={id} />
    </div>
  );
}
