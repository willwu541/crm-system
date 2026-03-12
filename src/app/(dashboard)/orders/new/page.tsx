import { OrderForm } from "@/components/orders/OrderForm";

export default function NewOrderPage() {
  return (
    <div>
      <h1 className="mb-6 text-xl font-semibold text-slate-800">新建询价订单</h1>
      <OrderForm />
    </div>
  );
}
