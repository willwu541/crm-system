import type { DataOwnerFilter } from "@/lib/access-policy";

export interface ExportContext {
  tenantId: string;
  userId: string;
  /** 未设置表示可看全部；否则只能看这些负责人的资料 */
  ownerFilter?: DataOwnerFilter;
}