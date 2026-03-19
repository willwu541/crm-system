import type { SessionUser } from "@/lib/auth";

export interface ExportContext {
  tenantId: string;
  userId: string;
  /** SALES 时仅看自己，ADMIN 可看团队 */
  ownerFilter?: { ownerId: string };
}
