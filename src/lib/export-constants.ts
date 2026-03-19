export const CUSTOMER_TYPES = [
  "EPC contractor",
  "General contractor",
  "Steel fabricator",
  "Distributor",
  "Stockist",
  "Importer",
  "Trading company",
  "Retailer",
  "End user",
  "Installer",
] as const;

export const INTERESTED_PRODUCTS = [
  "Steel Grating",
  "Stair Treads",
  "Trench Covers",
  "FRP Grating",
  "Accessories",
  "Handrail / Walkway",
] as const;

export const MARKET_PRIORITY = [
  "A_SEA",
  "A_MiddleEast",
  "B_Australia",
  "B_SouthAmerica",
  "C_Europe_USA",
] as const;

export const VALUE_LEVEL = [
  "high_potential",
  "active_buyer",
  "sample_customer",
  "price_sensitive",
  "long_term_followup",
] as const;

export const LEAD_STATUSES = [
  "new",
  "pending_review",
  "valid",
  "invalid",
  "converted",
] as const;

export const CUSTOMER_STATUSES = [
  "to_develop",
  "developing",
  "replied",
  "quoted",
  "negotiating",
  "won",
  "paused",
  "lost",
] as const;

export const ACTIVITY_TYPES = [
  "email",
  "call",
  "whatsapp",
  "linkedin",
  "meeting",
  "quote_followup",
  "other",
] as const;

export const QUOTE_STATUSES = [
  "draft",
  "sent",
  "replied",
  "negotiating",
  "won",
  "lost",
  "expired",
] as const;

export const PAYMENT_STATUSES = [
  "unpaid",
  "partial_paid",
  "paid",
] as const;

export const PRODUCTION_STATUSES = [
  "pending",
  "in_production",
  "completed",
] as const;

export const SHIPPING_STATUSES = [
  "pending",
  "ready_to_ship",
  "shipped",
  "completed",
] as const;

export const TASK_PRIORITIES = [
  "low",
  "medium",
  "high",
  "urgent",
] as const;

export const TASK_STATUSES = [
  "todo",
  "in_progress",
  "done",
  "overdue",
] as const;
