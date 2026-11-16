import type { Prisma } from "@prisma/client";

/** 删除/修正活动后，根据剩余记录重算线索联系统计 */
export async function recalcLeadContactStats(
  tx: Prisma.TransactionClient,
  leadId: string,
  tenantId: string,
) {
  const activities = await tx.exportActivity.findMany({
    where: { leadId, tenantId },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true, direction: true, type: true },
  });

  const contacts = activities.filter((item) => item.type !== "lifecycle");
  const lastContactAt = contacts[0]?.createdAt ?? null;
  const contactCount = contacts.filter((a) => a.direction === "outbound").length;

  await tx.exportLead.update({
    where: { id: leadId },
    data: { lastContactAt, contactCount },
  });
}
