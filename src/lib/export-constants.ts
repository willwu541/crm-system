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
  "Data Center Cable Trench",
  "Warehouse Mezzanine / Platform",
  "Solar Plant Walkway",
  "Offshore / Marine Platform",
  "Wastewater Plant Grating",
  "Petrochemical Plant",
  "Municipal Infrastructure",
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
  "facebook",
  "tiktok",
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

/** 邮件 / 沟通模板分类（对应开发客户全链路） */
export const EMAIL_TEMPLATE_CATEGORIES = [
  "dev_letter",       // 首封开发信 (D+0)
  "followup_1",       // Follow-up #1 (D+3)
  "followup_2",       // Follow-up #2 (D+7)
  "followup_3",       // Follow-up #3 (D+14 询样/项目需求)
  "long_tail",        // 长尾问候 (D+30+)
  "sample_request",   // 样品询问
  "quote_followup",   // 报价后跟进
  "push_close",       // 促单
  "holiday",          // 节日问候
  "reactivation",     // 沉睡客户唤醒
  "other",
] as const;

export const EMAIL_TEMPLATE_LANGUAGES = ["en", "zh"] as const;

/** 沟通方向 */
export const ACTIVITY_DIRECTIONS = ["outbound", "inbound"] as const;

/** Lead 来源渠道（预设可选；表单仍允许自定义文本） */
export const LEAD_SOURCE_CHANNELS = [
  "Alibaba",
  "Made-in-China",
  "Google",
  "Google Maps",
  "Bing",
  "LinkedIn",
  "WhatsApp",
  "Facebook",
  "TikTok",
  "YouTube",
  "Instagram",
  "X (Twitter)",
  "Reddit",
  "Industry Directory",
  "B2B Database",
  "Tender / Bid Platform",
  "Cold Calling",
  "Trade Show",       // 展会
  "Customer Referral",// 客户介绍
  "SEO",
  "Email Marketing",  // 邮件营销
  "Cold Outreach",    // 主动开发
  "Website Inquiry",  // 官网询盘
  "Other",
] as const;
