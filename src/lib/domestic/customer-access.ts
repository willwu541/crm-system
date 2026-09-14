import type { SessionUser } from "@/lib/auth";
import { ownerScope } from "@/lib/access-policy";

export {
  ANALYSIS_STATUS_LABELS,
  CUSTOMER_STATUS_LABELS,
  SENTIMENT_LABELS,
} from "./customer-labels";

export function customerOwnerFilter(user: SessionUser) {
  return ownerScope(user);
}

export function isAdminOrManager(user: SessionUser) {
  return user.role === "ADMIN" || user.role === "MANAGER";
}
