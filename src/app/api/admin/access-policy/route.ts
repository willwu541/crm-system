import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  canClaimDirector,
  canEditAccessPolicy,
  getAccessPolicy,
  isDirector,
  saveAccessPolicy,
} from "@/lib/access-policy";
import { z } from "zod";

export async function GET() {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }
  if (!canEditAccessPolicy(user) && !canClaimDirector(user)) {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }

  const policy = getAccessPolicy();
  let directorName: string | null = null;
  if (policy.directorUserId) {
    const director = await prisma.user.findUnique({
      where: { id: policy.directorUserId },
      select: { name: true },
    });
    directorName = director?.name ?? null;
  }

  const canEdit = canEditAccessPolicy(user);
  return NextResponse.json({
    data: {
      directorUserId: policy.directorUserId,
      directorName,
      canView: canEdit ? policy.canView : {},
      isDirector: isDirector(user),
      canClaim: canClaimDirector(user),
      canEdit,
    },
  });
}

const updateSchema = z.object({
  canView: z.record(z.string(), z.array(z.string())),
});

export async function PATCH(request: NextRequest) {
  const user = await getSession();
  if (!user || !canEditAccessPolicy(user)) {
    return NextResponse.json({ error: "只有业务经理可以改这项权限" }, { status: 403 });
  }

  const parsed = updateSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "参数错误" }, { status: 400 });
  }

  const policy = saveAccessPolicy({
    ...getAccessPolicy(),
    canView: parsed.data.canView,
  });

  return NextResponse.json({ data: policy });
}

export async function POST() {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });
  if (!canClaimDirector(user)) {
    return NextResponse.json({ error: "业务经理只能设一人，且需由管理员认领" }, { status: 403 });
  }

  const policy = saveAccessPolicy({
    ...getAccessPolicy(),
    directorUserId: user.id,
  });

  return NextResponse.json({ data: policy });
}
