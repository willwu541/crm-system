import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAccessPolicy, roleLabel } from "@/lib/access-policy";
import { requireExportSession } from "@/lib/export/auth";
import { assignableExportUserWhere, projectOwnerFilterUserWhere } from "@/lib/export/assignees";
import { canAssignExportWork } from "@/lib/export/lead-pool";

export async function GET(request: NextRequest) {
  const { user, ctx, error } = await requireExportSession();
  if (error) return error;

  const params = new URL(request.url).searchParams;
  const assignable = params.get("assignable") === "1";
  const ownerFilter = params.get("ownerFilter") === "1";
  if ((assignable || ownerFilter) && !canAssignExportWork(user!)) {
    return NextResponse.json({ error: "只有管理者可以分配" }, { status: 403 });
  }

  try {
    const directorId = getAccessPolicy().directorUserId;
    const users = await prisma.user.findMany({
      where: {
        tenant: "export",
        tenantId: ctx!.tenantId,
        isActive: true,
        ...(ownerFilter
          ? projectOwnerFilterUserWhere(directorId)
          : assignable
            ? assignableExportUserWhere(directorId)
            : {}),
      },
      select: { id: true, name: true, email: true, role: true },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({
      data: users.map((item) => ({
        id: item.id,
        name: item.name,
        email: item.email,
        roleLabel: roleLabel(item.role, item.id),
      })),
    });
  } catch (e) {
    console.error("Export users list error:", e);
    return NextResponse.json({ error: "加载用户列表失败" }, { status: 500 });
  }
}
