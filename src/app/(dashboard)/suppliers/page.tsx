import { getSession } from "@/lib/auth";
import { SupplierList } from "@/components/suppliers/SupplierList";

export default async function SuppliersPage() {
  const user = await getSession();
  if (!user) return null;

  return (
    <div>
      <h1 className="mb-6 text-xl font-semibold text-slate-800">加工户管理</h1>
      <SupplierList />
    </div>
  );
}
