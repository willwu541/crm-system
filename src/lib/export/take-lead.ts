import type { Prisma } from "@prisma/client";
import type { SessionUser } from "@/lib/auth";
import { DAILY_LEAD_CLAIM_LIMIT, isExportAdmin, startOfLocalDay } from "@/lib/export/lead-pool";

export class ExportLeadTakeError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ExportLeadTakeError";
    this.status = status;
  }
}

export type TakeExportLeadResult = { ok: true } | { ok: false; error: string; status: number };

/**
 * 公海线索被真正使用时写入负责人。已经归本人的不重复计数；
 * 已经归别人的不能抢走。非管理员每天最多领 20 条。
 */
export async function takeExportLeadFromPool(
  tx: Prisma.TransactionClient,
  args: {
    tenantId: string;
    leadId: string;
    user: Pick<SessionUser, "id" | "role">;
  },
): Promise<TakeExportLeadResult> {
  const current = await tx.exportLead.findUnique({
    where: { id: args.leadId, tenantId: args.tenantId },
    select: { id: true, ownerId: true, convertedToCustomerId: true },
  });
  if (!current) return { ok: false, error: "线索不存在", status: 404 };
  if (current.convertedToCustomerId) return { ok: false, error: "该线索已转化", status: 400 };
  if (current.ownerId) {
    if (current.ownerId === args.user.id || isExportAdmin(args.user)) return { ok: true };
    return { ok: false, error: "这条线索已经有人在跟", status: 409 };
  }

  if (!isExportAdmin(args.user)) {
    const used = await tx.exportLeadClaim.count({
      where: {
        tenantId: args.tenantId,
        userId: args.user.id,
        createdAt: { gte: startOfLocalDay() },
      },
    });
    if (used >= DAILY_LEAD_CLAIM_LIMIT) {
      return {
        ok: false,
        error: `今天已认领 ${DAILY_LEAD_CLAIM_LIMIT} 条，明天再选。这样是为了避免一次把公海领空。`,
        status: 429,
      };
    }
  }

  const taken = await tx.exportLead.updateMany({
    where: { id: args.leadId, tenantId: args.tenantId, ownerId: null },
    data: { ownerId: args.user.id, claimedAt: new Date() },
  });
  if (taken.count !== 1) return { ok: false, error: "这条线索刚刚被别人领走了", status: 409 };

  await tx.exportLeadClaim.create({
    data: { tenantId: args.tenantId, leadId: args.leadId, userId: args.user.id },
  });
  return { ok: true };
}

export function assertLeadTaken(result: TakeExportLeadResult): asserts result is { ok: true } {
  if (!result.ok) throw new ExportLeadTakeError(result.error, result.status);
}
