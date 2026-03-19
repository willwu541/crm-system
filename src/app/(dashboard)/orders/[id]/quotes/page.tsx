import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { serializeForClient } from "@/lib/utils";
import Link from "next/link";
import { QuoteComparison } from "@/components/orders/QuoteComparison";

export default async function OrderQuotesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getSession();
  if (!user) return null;

  const order = await prisma.order.findFirst({
    where: {
      id,
      ...(user.role === "SALES" ? { createdById: user.id } : {}),
    },
    include: {
      items: { orderBy: { sortOrder: "asc" } },
    },
  });

  if (!order) notFound();

  const serializedItems = serializeForClient(order.items);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-semibold text-slate-800">
          报价回收 - {order.orderNo}
        </h1>
        <Link
          href={`/orders/${id}`}
          className="shrink-0 rounded-md border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50"
        >
          返回订单
        </Link>
      </div>

      <QuoteComparison orderId={id} orderItems={serializedItems} />
    </div>
  );
}
