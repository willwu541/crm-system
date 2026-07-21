import Link from "next/link";
import { CustomerForm } from "@/components/customers/CustomerForm";

export default function NewCustomerPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-800">新建客户</h1>
        <Link href="/customers" className="text-sm text-teal-600 hover:underline">
          返回列表
        </Link>
      </div>
      <CustomerForm mode="create" />
    </div>
  );
}
