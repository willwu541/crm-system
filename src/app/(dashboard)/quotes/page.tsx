import { QuoteListClient } from "@/components/quotes/QuoteListClient";

export default function QuotesPage() {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-slate-800">客户报价</h1>
      <QuoteListClient />
    </div>
  );
}
