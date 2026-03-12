import { OpportunityForm } from "@/components/opportunities/OpportunityForm";

export default async function NewOpportunityPage({
  searchParams,
}: {
  searchParams: Promise<{ customerId?: string }>;
}) {
  const { customerId } = await searchParams;
  return (
    <div>
      <h1 className="mb-6 text-xl font-semibold text-slate-800">新建商机</h1>
      <OpportunityForm defaultCustomerId={customerId} />
    </div>
  );
}
