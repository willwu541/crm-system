import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireExportSession } from "@/lib/export/auth";

export async function GET(request: NextRequest) {
  const { ctx, error } = await requireExportSession();
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const direction = searchParams.get("direction")?.trim(); // inbound/outbound
  const type = searchParams.get("type")?.trim();
  const keyword = searchParams.get("keyword")?.trim();
  const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
  const pageSize = Math.min(50, Math.max(10, Number(searchParams.get("pageSize") ?? "20")));

  const where: Record<string, unknown> = { tenantId: ctx!.tenantId };
  if (direction) where.direction = direction;
  if (type) where.type = type;
  if (keyword) {
    where.OR = [
      { subject: { contains: keyword, mode: "insensitive" } },
      { content: { contains: keyword, mode: "insensitive" } },
      { customerNameSnapshot: { contains: keyword, mode: "insensitive" } },
      { contactNameSnapshot: { contains: keyword, mode: "insensitive" } },
    ];
  }

  const [data, total] = await Promise.all([
    prisma.exportActivity.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        owner: { select: { id: true, name: true } },
        customer: { select: { id: true, companyName: true } },
        lead: { select: { id: true, companyName: true } },
      },
    }),
    prisma.exportActivity.count({ where }),
  ]);

  return NextResponse.json({
    data,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  });
}

