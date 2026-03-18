import { getSession } from "@/lib/auth";
import { SupplierForm } from "@/components/suppliers/SupplierForm";

export default async function NewSupplierPage() {
  const user = await getSession();
  if (!user) return null;

  return (
    <div>
      <h1 className="mb-6 text-xl font-semibold text-slate-800">新增加工户</h1>
      <SupplierForm />
    </div>
  );
}
