import { getSession } from "@/lib/auth";
import { CustomerList } from "@/components/customers/CustomerList";

export default async function CustomersPage() {
  const user = await getSession();
  if (!user) return null;

  return (
    <div>
      <h1 className="mb-6 text-xl font-semibold text-slate-800">客户管理</h1>
      <CustomerList />
    </div>
  );
}
