import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { serializeForClient } from "@/lib/utils";
import { CustomerForm } from "@/components/customers/CustomerForm";

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getSession();
  if (!user) return null;

  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      opportunities: { orderBy: { createdAt: "desc" }, take: 10 },
      orders: { orderBy: { createdAt: "desc" }, take: 10 },
    },
  });

  if (!customer) notFound();

  const serializedOpps = serializeForClient(customer.opportunities);
  const serializedOrders = serializeForClient(customer.orders);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-800">客户详情 - {customer.name}</h1>
        <div className="flex gap-2">
          <Link
            href={`/opportunities/new?customerId=${id}`}
            className="rounded-md bg-teal-600 px-4 py-2 text-sm text-white hover:bg-teal-700"
          >
            新建商机
          </Link>
          <Link
            href="/customers"
            className="rounded-md border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50"
          >
            返回列表
          </Link>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="mb-4 font-medium text-slate-800">基本信息</h2>
        <CustomerForm
          customerId={id}
          initial={{
            name: customer.name,
            contactName: customer.contactName,
            contactPhone: customer.contactPhone,
            address: customer.address ?? "",
            remark: customer.remark ?? "",
          }}
        />
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="mb-4 font-medium text-slate-800">关联商机</h2>
        {serializedOpps.length === 0 ? (
          <p className="text-slate-500">暂无商机</p>
        ) : (
          <ul className="space-y-2">
            {serializedOpps.map((o: { id: string; projectName: string; status: string }) => (
              <li key={o.id}>
                <Link href={`/opportunities/${o.id}`} className="text-teal-600 hover:underline">
                  {o.projectName} ({o.status})
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="mb-4 font-medium text-slate-800">关联订单</h2>
        {serializedOrders.length === 0 ? (
          <p className="text-slate-500">暂无订单</p>
        ) : (
          <ul className="space-y-2">
            {serializedOrders.map((o: { id: string; orderNo: string }) => (
              <li key={o.id}>
                <Link href={`/orders/${o.id}`} className="text-teal-600 hover:underline">
                  {o.orderNo}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
