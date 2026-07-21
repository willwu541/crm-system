import type { CustomerStatus } from "@prisma/client";

export const REACTIVATION_STATUSES: CustomerStatus[] = ["ACTIVE", "DORMANT", "AWAKENING"];
