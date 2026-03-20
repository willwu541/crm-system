import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const user = await getSession();
  if (!user || user.role !== "ADMIN" || user.tenant !== "domestic") {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const pageSize = Math.min(100, Math.max(10, parseInt(searchParams.get("pageSize") ?? "20")));
  const entityType = searchParams.get("entityType")?.trim();

  const where = entityType ? { entityType } : {};

  const [rows, total] = await Promise.all([
    prisma.exportDeletionLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        deletedBy: { select: { id: true, name: true, email: true } },
      },
    }),
    prisma.exportDeletionLog.count({ where }),
  ]);

  return NextResponse.json({
    data: rows,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  });
}
