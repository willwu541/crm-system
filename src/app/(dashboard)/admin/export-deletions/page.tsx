import { ExportDeletionsClient } from "./ExportDeletionsClient";

export default function AdminExportDeletionsPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <h1 className="text-xl font-semibold text-slate-800">外贸数据删除记录</h1>
      <p className="text-sm text-slate-600">
        记录外贸系统中删除的线索、客户、联系人、跟进、报价、订单与任务，含删除前完整快照，便于审计。
      </p>
      <ExportDeletionsClient />
    </div>
  );
}
