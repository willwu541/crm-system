import { CustomersClient } from "@/components/export/CustomersClient";

export default function ExportCustomersPage() {
  return (
    <div>
      <h1 className="mb-6 text-xl font-semibold text-slate-800">Customers 客户</h1>
      <CustomersClient />
    </div>
  );
}
