import { ContactEditClient } from "@/components/export/ContactEditClient";

export default async function EditContactPage({
  params,
}: {
  params: Promise<{ id: string; contactId: string }>;
}) {
  const { id: customerId, contactId } = await params;
  return <ContactEditClient customerId={customerId} contactId={contactId} />;
}
