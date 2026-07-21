import { SeaPoolClient } from "@/components/customers/SeaPoolClient";

export default function SeaPoolPage() {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-slate-800">公海池</h1>
      <p className="mb-4 text-sm text-slate-500">
        跑单客户和释放客户在此展示，所有业务员均可认领。认领后需在 7 天内跟进，超时自动回收。
      </p>
      <SeaPoolClient />
    </div>
  );
}
