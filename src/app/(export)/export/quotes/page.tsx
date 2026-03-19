import { QuotesClient } from "@/components/export/QuotesClient";

export default function ExportQuotesPage() {
  return (
    <div>
      <h1 className="mb-6 text-xl font-semibold text-slate-800">Quotes 报价</h1>
      <QuotesClient />
    </div>
  );
}
