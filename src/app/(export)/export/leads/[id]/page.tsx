import { LeadDetailClient } from "@/components/export/LeadDetailClient";

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <LeadDetailClient leadId={id} />;
}
