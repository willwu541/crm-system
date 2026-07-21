import { QuoteDetailClient } from "@/components/quotes/QuoteDetailClient";

export default async function QuoteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-slate-800">报价详情</h1>
      <QuoteDetailClient quoteId={id} />
    </div>
  );
}
