import { NextRequest, NextResponse } from "next/server";
import { requireExportSession } from "@/lib/export/auth";
import { extractLeadManagerProjectNumber } from "@/lib/export/project-dispatch";
import { denyUnlessCanManageProjects, findProjectBySourceNumber } from "@/lib/export/projects";

/** 按 LeadManager 项目号查重。链接上的 version 参数会被丢掉，只比项目号。 */
export async function GET(request: NextRequest) {
  const { user, ctx, error } = await requireExportSession();
  if (error) return error;
  const denied = denyUnlessCanManageProjects(user!);
  if (denied) return denied;

  const number = extractLeadManagerProjectNumber(request.nextUrl.searchParams.get("number"));
  if (!number) return NextResponse.json({ data: null, number: null });

  const exclude = request.nextUrl.searchParams.get("exclude")?.trim() || undefined;
  const existing = await findProjectBySourceNumber(ctx!.tenantId, number, exclude);
  return NextResponse.json({
    number,
    data: existing ? { id: existing.id, name: existing.name } : null,
  });
}
