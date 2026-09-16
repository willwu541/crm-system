import { ProjectDetailClient } from "@/components/export/ProjectDetailClient";

export default async function ExportProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ProjectDetailClient projectId={id} />;
}
