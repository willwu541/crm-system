import { CustomerEditClient } from "@/components/export/CustomerEditClient";

export default async function CustomerEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <CustomerEditClient customerId={id} />;
}
