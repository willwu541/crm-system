import { QuoteDetailClient } from "@/components/export/QuoteDetailClient";

export default async function QuoteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <QuoteDetailClient quoteId={id} />;
}
