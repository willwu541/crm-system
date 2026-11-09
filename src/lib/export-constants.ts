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
  "research",
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

/** 项目录入状态：未录入 / 已录入 */
export const PROJECT_ENTRY_STATUSES = ["pending", "entered"] as const;

/** 外贸项目找人：跟进状态 */
export const PROJECT_STATUSES = [
  "hunting",
  "contacting",
  "quoted",
  "won",
  "lost",
  "parked",
] as const;

/** 项目工程阶段（列表「阶段」列） */
export const PROJECT_STAGES = [
  "planning",
  "design_docs",
  "tendering",
  "awarded",
  "construction",
  "mep_install",
  "commissioning",
  "delayed",
  "unknown",
] as const;

/** 项目行业 */
export const PROJECT_INDUSTRIES = [
  "data_center",
  "power_substation",
  "port_shipyard_offshore",
  "petrochemical_lng",
  "chemical_cement_steel",
  "warehouse_logistics",
  "municipal_infra",
  "other",
] as const;

/** 需求是否坐实。新建默认第一项，业务员联系后再改。 */
export const PROJECT_DEMAND_STATUSES = ["需求待核实", "确认使用", "不使用", "已下单", "归分包"] as const;

export const PROJECT_DEMAND_DEFAULT = PROJECT_DEMAND_STATUSES[0];

/** 信息可靠度 */
export const PROJECT_CONFIDENCE = [
  "unknown",
  "low",
  "medium",
  "high",
] as const;

/**
 * 录入时给人点的角色。
 * fabricator、other 仍留在 PROJECT_PARTY_ROLES，旧行继续能存、能显示，只是不再作为新选项。
 */
export const PROJECT_PARTY_ROLE_CHOICES = [
  "owner",
  "epc",
  "general_contractor",
  "subcontractor",
  "consultant",
  "designer",
  "procurement",
] as const;

/** 外贸项目找人：参与方角色。含已停用选项，避免旧参与方校验失败。 */
export const PROJECT_PARTY_ROLES = [
  ...PROJECT_PARTY_ROLE_CHOICES,
  "fabricator",
  "other",
] as const;

/** 下拉和提示里展示的角色，按用户口头说法。 */
export const PROJECT_PARTY_ROLE_CHOICE_TEXT = "业主、EPC、总包、分包、顾问、设计师、采购";

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
