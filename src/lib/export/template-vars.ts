/**
 * 邮件 / 沟通模板的变量渲染。
 *
 * 支持的占位符（大小写敏感）：
 *   {{customer.companyName}}  {{customer.country}}  {{customer.city}}
 *   {{customer.website}}      {{customer.code}}
 *   {{lead.companyName}}      {{lead.country}}      {{lead.city}}
 *   {{lead.website}}
 *   {{contact.name}}          {{contact.title}}     {{contact.email}}
 *   {{contact.phone}}         {{contact.whatsapp}}
 *   {{quote.no}}              {{quote.totalAmount}} {{quote.currency}}
 *   {{user.name}}             {{user.email}}        {{user.signature}}
 *   {{today}}                 {{year}}
 *
 * 模板里的 {{xxx}} 没匹配到时保留原样（方便业务员一眼看到漏配）。
 */

export interface TemplateVarsInput {
  customer?: {
    companyName?: string | null;
    customerCode?: string | null;
    country?: string | null;
    city?: string | null;
    website?: string | null;
  } | null;
  lead?: {
    companyName?: string | null;
    country?: string | null;
    city?: string | null;
    website?: string | null;
  } | null;
  contact?: {
    name?: string | null;
    title?: string | null;
    email?: string | null;
    phone?: string | null;
    whatsapp?: string | null;
  } | null;
  quote?: {
    quoteNo?: string | null;
    totalAmount?: string | number | null;
    currency?: string | null;
  } | null;
  user?: {
    name?: string | null;
    email?: string | null;
    emailSignature?: string | null;
  } | null;
}

function fmt(v: unknown): string {
  if (v == null) return "";
  return String(v);
}

/**
 * 把输入对象拍平成 Record<string, string>，key 是带点的路径，如 "customer.companyName"。
 */
function flattenContext(input: TemplateVarsInput): Record<string, string> {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const year = String(now.getFullYear());

  const map: Record<string, string> = {
    today,
    year,
    "customer.companyName": fmt(input.customer?.companyName),
    "customer.code": fmt(input.customer?.customerCode),
    "customer.country": fmt(input.customer?.country),
    "customer.city": fmt(input.customer?.city),
    "customer.website": fmt(input.customer?.website),
    "lead.companyName": fmt(input.lead?.companyName),
    "lead.country": fmt(input.lead?.country),
    "lead.city": fmt(input.lead?.city),
    "lead.website": fmt(input.lead?.website),
    "contact.name": fmt(input.contact?.name),
    "contact.title": fmt(input.contact?.title),
    "contact.email": fmt(input.contact?.email),
    "contact.phone": fmt(input.contact?.phone),
    "contact.whatsapp": fmt(input.contact?.whatsapp),
    "quote.no": fmt(input.quote?.quoteNo),
    "quote.totalAmount": fmt(input.quote?.totalAmount),
    "quote.currency": fmt(input.quote?.currency),
    "user.name": fmt(input.user?.name),
    "user.email": fmt(input.user?.email),
    "user.signature": fmt(input.user?.emailSignature),
  };
  return map;
}

/**
 * 渲染单个字符串。未匹配的占位符保留原样。
 */
export function renderTemplateString(template: string, input: TemplateVarsInput): string {
  if (!template) return "";
  const ctx = flattenContext(input);
  return template.replace(/\{\{\s*([a-zA-Z_][a-zA-Z0-9_.]*)\s*\}\}/g, (match, key) => {
    const v = ctx[key as keyof typeof ctx];
    if (v == null) return match;
    return v === "" ? match : v;
  });
}

/**
 * 同时渲染主题与正文。
 */
export function renderTemplate(
  template: { subject: string; body: string },
  input: TemplateVarsInput,
): { subject: string; body: string } {
  return {
    subject: renderTemplateString(template.subject, input),
    body: renderTemplateString(template.body, input),
  };
}

/**
 * 提取模板里使用到的占位符（去重），供前端"该模板使用了哪些变量"提示。
 */
export function extractTemplateVars(text: string): string[] {
  if (!text) return [];
  const set = new Set<string>();
  const re = /\{\{\s*([a-zA-Z_][a-zA-Z0-9_.]*)\s*\}\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    set.add(m[1]);
  }
  return Array.from(set);
}

/** 所有可用变量（用于编辑器的"插入变量"按钮） */
export const AVAILABLE_TEMPLATE_VARS: { key: string; description: string }[] = [
  { key: "customer.companyName", description: "客户公司名" },
  { key: "customer.country", description: "客户国家" },
  { key: "customer.city", description: "客户城市" },
  { key: "customer.code", description: "客户编号" },
  { key: "customer.website", description: "客户网站" },
  { key: "lead.companyName", description: "线索公司名（线索阶段使用）" },
  { key: "lead.country", description: "线索国家" },
  { key: "lead.city", description: "线索城市" },
  { key: "lead.website", description: "线索网站" },
  { key: "contact.name", description: "联系人姓名" },
  { key: "contact.title", description: "联系人职位" },
  { key: "contact.email", description: "联系人邮箱" },
  { key: "contact.phone", description: "联系人电话" },
  { key: "contact.whatsapp", description: "联系人 WhatsApp" },
  { key: "quote.no", description: "报价编号" },
  { key: "quote.totalAmount", description: "报价总金额" },
  { key: "quote.currency", description: "报价币种" },
  { key: "user.name", description: "我的姓名" },
  { key: "user.email", description: "我的邮箱" },
  { key: "user.signature", description: "我的邮件签名" },
  { key: "today", description: "今天日期 YYYY-MM-DD" },
  { key: "year", description: "当前年份" },
];
