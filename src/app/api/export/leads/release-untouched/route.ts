import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireExportSession } from "@/lib/export/auth";
import { isExportAdmin } from "@/lib/export/lead-pool";

/** 把还没人联系过的线索放回公海，已经在跟的不动。 */
export async function POST() {
  const { user, ctx, error } = await requireExportSession();
  if (error) return error;
  if (!isExportAdmin(user!)) {
    return NextResponse.json({ error: "只有管理员可以放回公海" }, { status: 403 });
  }

  const released = await prisma.exportLead.updateMany({
    where: {
      tenantId: ctx!.tenantId,
      ownerId: { not: null },
      convertedToCustomerId: null,
      contactCount: 0,
      lastContactAt: null,
    },
    data: { ownerId: null, claimedAt: null },
  });

  return NextResponse.json({ data: { released: released.count } });
}
