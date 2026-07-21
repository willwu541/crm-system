import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const user = await getSession();
  if (!user || user.tenant !== "domestic") return NextResponse.json({ error: "未登录" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const entityType = searchParams.get("entityType");
  const entityId = searchParams.get("entityId");

  if (!entityType || !entityId) return NextResponse.json({ error: "缺少参数" }, { status: 400 });

  const files = await prisma.fileAttachment.findMany({
    where: { entityType, entityId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ data: files });
}
