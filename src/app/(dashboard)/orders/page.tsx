import { getSession } from "@/lib/auth";
import { OrderList } from "@/components/orders/OrderList";

export default async function OrdersPage() {
  const user = await getSession();
  if (!user) return null;

  return (
    <div>
      <h1 className="mb-6 text-xl font-semibold text-slate-800">订单列表</h1>
      <OrderList />
    </div>
  );
}
