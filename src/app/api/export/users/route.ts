import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireExportSession } from "@/lib/export/auth";

export async function GET() {
  const { ctx, error } = await requireExportSession();
  if (error) return error;

  const users = await prisma.user.findMany({
    where: { tenant: "export", tenantId: ctx!.tenantId },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ data: users });
}
