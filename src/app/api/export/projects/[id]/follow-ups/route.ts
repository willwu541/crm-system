import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireExportSession } from "@/lib/export/auth";
import { canMarkExportProject } from "@/lib/export/project-activity";
import { formatFollowUpDate, parseFollowUpDate } from "@/lib/export/follow-up-due";
import { PROJECT_DETAIL_INCLUDE, getProjectOrError, projectDetailPayload } from "@/lib/export/projects";

const bodySchema = z.object({
  content: z.string().trim().min(1, "请填写跟进内容").max(4000, "跟进内容太长"),
  /** 可顺便定下次跟进日期；传空串或 null 清空。 */
  nextFollowUpAt: z.string().optional().nullable(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { user, ctx, error } = await requireExportSession();
  if (error) return error;
  const { id } = await params;
  const { project, error: err } = await getProjectOrError(id, ctx!.tenantId, user!);
  if (err) return err;
  if (!canMarkExportProject(user!, project!.ownerId)) {
    return NextResponse.json({ error: "只有负责人和管理者可以写跟进" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求体无效" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "参数错误" }, { status: 400 });
  }
  const nextFollowUpAt = parseFollowUpDate(parsed.data.nextFollowUpAt);
  if (parsed.data.nextFollowUpAt !== undefined && nextFollowUpAt === undefined) {
    return NextResponse.json({ error: "下次跟进日期无效" }, { status: 400 });
  }
  const nextDay = nextFollowUpAt === undefined ? undefined : formatFollowUpDate(nextFollowUpAt);
  const dayChanged = nextDay !== undefined && nextDay !== formatFollowUpDate(project!.nextFollowUpAt);

  const fresh = await prisma.$transaction(async (tx) => {
    await tx.exportProjectActivity.create({
      data: {
        tenantId: ctx!.tenantId,
        projectId: id,
        userId: user!.id,
        kind: "follow_up",
        content: parsed.data.content,
      },
    });
    if (dayChanged) {
      await tx.exportProject.update({
        where: { id, tenantId: ctx!.tenantId },
        data: { nextFollowUpAt: nextFollowUpAt ?? null },
      });
      await tx.exportProjectActivity.create({
        data: {
          tenantId: ctx!.tenantId,
          projectId: id,
          userId: user!.id,
          kind: "next_follow_up",
          content: nextDay || null,
        },
      });
    }
    return tx.exportProject.findUniqueOrThrow({
      where: { id, tenantId: ctx!.tenantId },
      include: PROJECT_DETAIL_INCLUDE,
    });
  });
  return NextResponse.json({ data: projectDetailPayload(fresh, user!) });
}
