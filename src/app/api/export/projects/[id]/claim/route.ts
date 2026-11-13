import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireExportSession } from "@/lib/export/auth";
import { PROJECT_DETAIL_INCLUDE, claimUnassignedExportProject } from "@/lib/export/projects";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { user, ctx, error } = await requireExportSession();
  if (error) return error;
  const { id } = await params;

  const taken = await claimUnassignedExportProject({
    tenantId: ctx!.tenantId,
    projectId: id,
    user: user!,
  });
  if (!taken.ok) {
    return NextResponse.json({ error: taken.error }, { status: taken.status });
  }

  const project = await prisma.exportProject.findUnique({
    where: { id, tenantId: ctx!.tenantId },
    include: PROJECT_DETAIL_INCLUDE,
  });
  return NextResponse.json({ data: project });
}
