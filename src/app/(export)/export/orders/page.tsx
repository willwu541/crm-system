import { OrdersClient } from "@/components/export/OrdersClient";

export default function ExportOrdersPage() {
  return (
    <div>
      <h1 className="mb-6 text-xl font-semibold text-slate-800">Orders 订单</h1>
      <OrdersClient />
    </div>
  );
}
