import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/** 将 Prisma 查询结果转为可存入 Json 的快照 */
export function toSnapshotJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(
    JSON.stringify(value, (_k, v) => {
      if (typeof v === "bigint") return v.toString();
      if (v != null && typeof v === "object") {
        const ctor = (v as { constructor?: { name?: string } }).constructor?.name;
        if (ctor === "Decimal" || ctor === "Big") return String(v);
      }
      return v;
    })
  ) as Prisma.InputJsonValue;
}

export type ExportEntityType =
  | "lead"
  | "customer"
  | "contact"
  | "activity"
  | "quote"
  | "order"
  | "task";

export async function deleteWithExportLog(params: {
  tenantId: string;
  entityType: ExportEntityType;
  recordId: string;
  summary: string;
  snapshot: unknown;
  deletedById: string;
  deleteFn: (tx: Prisma.TransactionClient) => Promise<unknown>;
}): Promise<void> {
  const { tenantId, entityType, recordId, summary, snapshot, deletedById, deleteFn } = params;
  await prisma.$transaction(async (tx) => {
    await tx.exportDeletionLog.create({
      data: {
        tenantId,
        entityType,
        recordId,
        summary,
        snapshot: toSnapshotJson(snapshot),
        deletedById,
      },
    });
    await deleteFn(tx);
  });
}
