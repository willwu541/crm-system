import { ContactFormClient } from "@/components/export/ContactFormClient";

export default async function NewContactPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ContactFormClient customerId={id} />;
}
