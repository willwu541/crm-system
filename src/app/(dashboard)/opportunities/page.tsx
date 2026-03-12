import { getSession } from "@/lib/auth";
import { OpportunityList } from "@/components/opportunities/OpportunityList";

export default async function OpportunitiesPage() {
  const user = await getSession();
  if (!user) return null;

  return (
    <div>
      <h1 className="mb-6 text-xl font-semibold text-slate-800">商机管理</h1>
      <OpportunityList />
    </div>
  );
}
