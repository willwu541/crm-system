import { CustomerForm } from "@/components/export/CustomerForm";

export default function NewCustomerPage() {
  return (
    <div>
      <h1 className="mb-6 text-xl font-semibold text-slate-800">新建客户</h1>
      <CustomerForm />
    </div>
  );
}
