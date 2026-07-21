import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { customerOwnerFilter } from "@/lib/domestic/customer-access";
import { CustomerListClient, type CustomerRow } from "@/components/customers/CustomerListClient";
import { serializeForClient } from "@/lib/utils";

export default async function CustomersPage() {
  const user = await getSession();
  if (!user) redirect("/login");

  const customers = await prisma.customer.findMany({
    where: customerOwnerFilter(user),
    include: {
      owner: { select: { name: true } },
      _count: { select: { recordings: true, orders: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: 20,
  });

  const initialData: CustomerRow[] = serializeForClient(customers).map((c: any) => ({ ...c, tier: c.tier || "NORMAL" }));

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-slate-800">客户管理</h1>
      <CustomerListClient initialData={initialData} />
    </div>
  );
}
