import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireExportSession } from "@/lib/export/auth";
import { findAssignableExportUser } from "@/lib/export/assignees";
import { denyUnlessCanManageProjects } from "@/lib/export/projects";
import { prismaErrorToUserMessage } from "@/lib/prisma-user-message";

const schema = z.object({
  projectIds: z.array(z.string().trim().min(1)).min(1, "请先选择项目").max(200, "一次最多分配 200 个项目"),
  ownerId: z.string().trim().min(1, "请选择业务员"),
});

export async function POST(request: NextRequest) {
  const { user, ctx, error } = await requireExportSession();
  if (error) return error;
  const denied = denyUnlessCanManageProjects(user!);
  if (denied) return denied;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求体无效或为空，请刷新页面后重试" }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "参数错误" }, { status: 400 });
  }

  try {
    const tenantId = ctx!.tenantId;
    const ownerId = parsed.data.ownerId;
    const assignable = await findAssignableExportUser(tenantId, ownerId);
    if (!assignable) {
      return NextResponse.json({ error: "这个人不能被分配项目" }, { status: 400 });
    }
    const assignee = await prisma.user.findUnique({ where: { id: ownerId }, select: { name: true } });
    const ids = [...new Set(parsed.data.projectIds)];
    const rows = await prisma.exportProject.findMany({
      where: { tenantId, id: { in: ids } },
      select: { id: true, ownerId: true },
    });
    const changeIds = rows.filter((row) => row.ownerId !== ownerId).map((row) => row.id);

    if (changeIds.length > 0) {
      await prisma.$transaction([
        prisma.exportProject.updateMany({
          where: { tenantId, id: { in: changeIds } },
          data: { ownerId },
        }),
        prisma.exportProjectActivity.createMany({
          data: changeIds.map((projectId) => ({
            tenantId,
            projectId,
            userId: user!.id,
            kind: "assign",
            content: assignee?.name?.trim() || null,
          })),
        }),
      ]);
    }

    return NextResponse.json({ updated: changeIds.length, skipped: ids.length - changeIds.length });
  } catch (e) {
    console.error("Batch assign export projects error:", e);
    return NextResponse.json({ error: prismaErrorToUserMessage(e, "批量分配失败") }, { status: 500 });
  }
}
