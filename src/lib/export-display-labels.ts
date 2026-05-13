/**
 * 外贸模块下拉与列表展示用文案（中文 / 中英混合）。
 * 数据库存储值仍为 export-constants 中的英文 key，避免历史数据失效。
 */

export const customerTypeLabel: Record<string, string> = {
  "EPC contractor": "EPC 总包 (EPC contractor)",
  "General contractor": "综合承包商 (General contractor)",
  "Steel fabricator": "钢结构/钢制品加工厂 (Steel fabricator)",
  Distributor: "分销商 (Distributor)",
  Stockist: "库存商 (Stockist)",
  Importer: "进口商 (Importer)",
  "Trading company": "贸易公司 (Trading company)",
  Retailer: "零售商 (Retailer)",
  "End user": "终端用户 (End user)",
  Installer: "安装商 (Installer)",
};

export const interestedProductLabel: Record<string, string> = {
  "Steel Grating": "钢格板 (Steel Grating)",
  "Stair Treads": "踏步板 (Stair Treads)",
  "Trench Covers": "沟盖板 (Trench Covers)",
  "FRP Grating": "玻璃钢格板 (FRP Grating)",
  Accessories: "配件 (Accessories)",
  "Handrail / Walkway": "栏杆/走道 (Handrail / Walkway)",
};

export const marketPriorityLabel: Record<string, string> = {
  A_SEA: "A 东南亚 (SEA)",
  A_MiddleEast: "A 中东 (Middle East)",
  B_Australia: "B 澳洲 (Australia)",
  B_SouthAmerica: "B 南美 (South America)",
  C_Europe_USA: "C 欧美 (Europe / USA)",
};

export const valueLevelLabel: Record<string, string> = {
  high_potential: "高潜力 (high potential)",
  active_buyer: "活跃买家 (active buyer)",
  sample_customer: "样品客户 (sample customer)",
  price_sensitive: "价格敏感 (price sensitive)",
  long_term_followup: "长期跟进 (long-term follow-up)",
};

export const leadStatusLabel: Record<string, string> = {
  new: "新线索",
  pending_review: "待审核",
  valid: "有效",
  invalid: "无效",
  converted: "已转化",
};

export const customerStatusLabel: Record<string, string> = {
  to_develop: "待开发",
  developing: "开发中",
  replied: "已回复",
  quoted: "已报价",
  negotiating: "谈判中",
  won: "已成交",
  paused: "暂停",
  lost: "已流失",
};

export const activityTypeLabel: Record<string, string> = {
  email: "邮件 (Email)",
  call: "电话 (Call)",
  whatsapp: "WhatsApp",
  linkedin: "领英 (LinkedIn)",
  meeting: "会议 (Meeting)",
  quote_followup: "报价跟进 (Quote follow-up)",
  other: "其他 (Other)",
};

export const quoteStatusLabel: Record<string, string> = {
  draft: "草稿",
  sent: "已发送",
  replied: "已回复",
  negotiating: "谈判中",
  won: "已成交",
  lost: "已流失",
  expired: "已过期",
};

export const paymentStatusLabel: Record<string, string> = {
  unpaid: "未付款",
  partial_paid: "部分付款",
  paid: "已付款",
};

export const productionStatusLabel: Record<string, string> = {
  pending: "待生产",
  in_production: "生产中",
  completed: "已完成",
};

export const shippingStatusLabel: Record<string, string> = {
  pending: "待发货",
  ready_to_ship: "待出库 (ready to ship)",
  shipped: "已发货",
  completed: "已完成",
};

export const taskPriorityLabel: Record<string, string> = {
  low: "低",
  medium: "中",
  high: "高",
  urgent: "紧急",
};

export const taskStatusLabel: Record<string, string> = {
  todo: "待办",
  in_progress: "进行中",
  done: "已完成",
  overdue: "超期",
};

export const emailTemplateCategoryLabel: Record<string, string> = {
  dev_letter: "首封开发信 (Dev letter)",
  followup_1: "Follow-up #1（3 天）",
  followup_2: "Follow-up #2（1 周）",
  followup_3: "Follow-up #3（2 周）",
  long_tail: "长尾跟进（1 个月+）",
  sample_request: "样品询问",
  quote_followup: "报价后跟进",
  push_close: "促单 (Push close)",
  holiday: "节日问候",
  reactivation: "沉睡客户唤醒",
  other: "其他 (Other)",
};

export const emailTemplateLanguageLabel: Record<string, string> = {
  en: "English",
  zh: "中文",
};

export const activityDirectionLabel: Record<string, string> = {
  outbound: "发出 (Outbound)",
  inbound: "回复 (Inbound)",
};

/** 任意 key：有映射则返回中文/中英文案，否则原样返回（兼容旧数据） */
export function displayLabel(map: Record<string, string>, value: string | null | undefined): string {
  if (value == null || value === "") return "-";
  return map[value] ?? value;
}

/** 客户「感兴趣产品」多选展示 */
export function displayInterestedProductsList(arr: string[] | null | undefined): string {
  if (!Array.isArray(arr) || arr.length === 0) return "-";
  return arr.map((x) => interestedProductLabel[x] ?? x).join("，");
}
