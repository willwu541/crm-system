import { ActivityFormClient } from "@/components/export/ActivityFormClient";

export default async function NewActivityPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ActivityFormClient customerId={id} />;
}
