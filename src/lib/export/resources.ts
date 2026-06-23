/**
 * 钢格板外贸「资料库」静态速查数据。
 * 纯静态、零数据库依赖，便于业务员随时查阅与复制。
 */

export interface MarketHoliday {
  /** ISO month-day，便于按当年计算具体日期 */
  monthDay: string;
  name: string;
  region: string;
  note?: string;
}

/** 出口主要市场常用节日（用于把握跟进/问候时机；穆斯林节日为大致区间，需按当年核对） */
export const MARKET_HOLIDAYS: MarketHoliday[] = [
  { monthDay: "01-01", name: "元旦 New Year", region: "全球" },
  { monthDay: "01-26", name: "澳大利亚国庆 Australia Day", region: "澳大利亚" },
  { monthDay: "02-06", name: "怀唐伊日 Waitangi Day", region: "新西兰" },
  { monthDay: "03-30", name: "斋月开始 Ramadan(约)", region: "中东/穆斯林", note: "每年提前约11天，需核对" },
  { monthDay: "04-21", name: "复活节 Easter(约)", region: "欧美/澳新", note: "按当年" },
  { monthDay: "04-25", name: "澳新军团日 ANZAC Day", region: "澳大利亚/新西兰" },
  { monthDay: "04-30", name: "开斋节 Eid al-Fitr(约)", region: "中东/穆斯林", note: "按当年核对" },
  { monthDay: "05-01", name: "劳动节 Labour Day", region: "多国" },
  { monthDay: "07-04", name: "美国独立日 Independence Day", region: "美国" },
  { monthDay: "07-07", name: "宰牲节 Eid al-Adha(约)", region: "中东/穆斯林", note: "按当年核对" },
  { monthDay: "09-16", name: "独立日 Independence Day", region: "墨西哥" },
  { monthDay: "10-03", name: "德国统一日", region: "德国" },
  { monthDay: "11-11", name: "退伍军人节/光棍节大促", region: "美国/全球电商" },
  { monthDay: "11-28", name: "感恩节 Thanksgiving(约)", region: "美国", note: "11月第4个周四" },
  { monthDay: "11-29", name: "黑色星期五 Black Friday", region: "全球电商" },
  { monthDay: "12-25", name: "圣诞节 Christmas", region: "欧美/澳新/拉美" },
  { monthDay: "12-26", name: "节礼日 Boxing Day", region: "英联邦" },
];

export interface GratingSpec {
  group: string;
  items: { label: string; value: string }[];
}

/** 钢格板常用规格速查（与报价/邮件话术配套） */
export const GRATING_SPECS: GratingSpec[] = [
  {
    group: "扁钢间距 (Bearing bar pitch)",
    items: [
      { label: "常用承重扁钢间距", value: "30mm / 34.3mm / 40mm / 41.3mm" },
      { label: "横杆间距 (Cross bar)", value: "50mm / 100mm / 38.1mm / 76.2mm" },
    ],
  },
  {
    group: "扁钢规格 (Bearing bar)",
    items: [
      { label: "高度 Height", value: "20–100mm（常见 25/30/32/40/50/65mm）" },
      { label: "厚度 Thickness", value: "2 / 3 / 4 / 5 / 6mm" },
    ],
  },
  {
    group: "型号示例 (Type)",
    items: [
      { label: "锯齿防滑 Serrated", value: "S 系列 (如 S32/3, 30/100)" },
      { label: "齐平 Plain", value: "P 系列 (如 30/100, 40/100)" },
      { label: "压锁/插接", value: "Press-locked / Swage-locked" },
    ],
  },
  {
    group: "表面处理 (Surface)",
    items: [
      { label: "热浸镀锌", value: "Hot-dip galvanized (HDG, ASTM A123)" },
      { label: "电镀锌 / 喷漆", value: "Electro-galvanized / Painted" },
      { label: "不锈钢", value: "SS304 / SS316" },
    ],
  },
  {
    group: "材质 / 标准 (Material / Standard)",
    items: [
      { label: "碳钢", value: "Q235 / A36 / S275" },
      { label: "常用标准", value: "ANSI/NAAMM, BS 4592, AS 1657, ISO 1461(镀锌)" },
      { label: "包装", value: "钢带打包 + 木托盘 / 出口熏蒸托盘" },
    ],
  },
];

export interface LinkItem {
  name: string;
  url: string;
  note?: string;
}

export interface LinkGroup {
  group: string;
  links: LinkItem[];
}

/** 常用 AI 问询入口（点击直达） */
export const AI_LINKS: LinkItem[] = [
  { name: "ChatGPT", url: "https://chat.openai.com", note: "通用问询/邮件润色" },
  { name: "Claude", url: "https://claude.ai", note: "长文档总结/回复草稿" },
  { name: "Gemini", url: "https://gemini.google.com", note: "Google 生态联动" },
  { name: "Perplexity", url: "https://www.perplexity.ai", note: "带来源检索" },
  { name: "DeepSeek", url: "https://chat.deepseek.com", note: "低成本日常问答" },
  { name: "Kimi", url: "https://kimi.moonshot.cn", note: "中文场景好用" },
  { name: "Grok", url: "https://grok.com", note: "趋势/社媒话题" },
  { name: "Poe", url: "https://poe.com", note: "多模型聚合" },
];

/** 常见提问模板，复制到任意 AI 可直接用 */
export const AI_PROMPTS: { title: string; prompt: string }[] = [
  {
    title: "开发信优化",
    prompt:
      "你是钢格板外贸销售助手。请把这封英文开发信优化到150词内，保留专业但不生硬，最后加一个明确CTA。原文：",
  },
  {
    title: "客户回复分类",
    prompt:
      "请将下面客户回复按【价格异议/交期异议/规格不清/暂缓项目/有明确需求】分类，并给我下一步跟进建议（24小时内可执行）：",
  },
  {
    title: "规格需求澄清",
    prompt:
      "客户问 steel grating price，但信息不全。请生成一段英文澄清问题清单（不超过8条），包含 bar pitch、flat bar size、surface、load、panel size、quantity、destination：",
  },
  {
    title: "报价跟进话术",
    prompt:
      "请生成3版英文报价后跟进话术：D+3、D+7、D+14。语气专业、简短，可用于邮件和WhatsApp：",
  },
];

/** 常用网站导航：开发客户、平台、物流、标准、汇率等 */
export const USEFUL_LINKS: LinkGroup[] = [
  {
    group: "B2B / 找客户",
    links: [
      { name: "Alibaba", url: "https://www.alibaba.com", note: "国际站" },
      { name: "Made-in-China", url: "https://www.made-in-china.com" },
      { name: "Global Sources", url: "https://www.globalsources.com" },
      { name: "Europages", url: "https://www.europages.co.uk", note: "欧洲采购名录" },
      { name: "ThomasNet", url: "https://www.thomasnet.com", note: "北美工业采购" },
      { name: "Kompass", url: "https://www.kompass.com", note: "全球企业名录" },
    ],
  },
  {
    group: "搜索 / 调研",
    links: [
      { name: "Google", url: "https://www.google.com" },
      { name: "Google Maps", url: "https://www.google.com/maps", note: "找当地经销商/工程商" },
      { name: "LinkedIn", url: "https://www.linkedin.com" },
      { name: "LinkedIn Sales Nav", url: "https://www.linkedin.com/sales" },
      { name: "Hunter.io", url: "https://hunter.io", note: "找邮箱" },
      { name: "海关数据 ImportYeti", url: "https://www.importyeti.com", note: "美国进口商" },
    ],
  },
  {
    group: "社媒 / 内容获客",
    links: [
      { name: "Facebook", url: "https://www.facebook.com" },
      { name: "Instagram", url: "https://www.instagram.com" },
      { name: "TikTok", url: "https://www.tiktok.com" },
      { name: "YouTube", url: "https://www.youtube.com" },
      { name: "X (Twitter)", url: "https://twitter.com" },
      { name: "WhatsApp Business", url: "https://business.whatsapp.com" },
    ],
  },
  {
    group: "物流 / 报关 / 汇率",
    links: [
      { name: "海运订舱 freightos", url: "https://www.freightos.com", note: "查海运价" },
      { name: "船期 Maersk", url: "https://www.maersk.com" },
      { name: "集装箱追踪 track-trace", url: "https://www.track-trace.com" },
      { name: "XE 汇率", url: "https://www.xe.com" },
      { name: "海关 HS Code", url: "https://www.tariffnumber.com", note: "钢格板常见 7308/7314" },
    ],
  },
  {
    group: "标准 / 行业",
    links: [
      { name: "NAAMM Metal Bar Grating", url: "https://www.naamm.org" },
      { name: "BS 4592 介绍", url: "https://www.bsigroup.com" },
      { name: "AS 1657 (澳标)", url: "https://www.standards.org.au" },
      { name: "ASTM A123 镀锌", url: "https://www.astm.org" },
    ],
  },
];

export interface ChannelPlaybook {
  channel: string;
  tip: string;
}

/** 社媒 / 获客渠道速记话术 */
export const CHANNEL_PLAYBOOK: ChannelPlaybook[] = [
  { channel: "LinkedIn", tip: "先看公司+职位，连接语简短点题，主攻采购/项目工程师/老板。" },
  { channel: "WhatsApp", tip: "首条只发一句话+一张产品图，不要长段；问对方项目与规格需求。" },
  { channel: "Facebook", tip: "进当地建筑/工业采购群组，先评论互动再私信，避免硬广。" },
  { channel: "TikTok", tip: "发生产/装柜/工地安装短视频，简介挂官网与 WhatsApp。" },
  { channel: "邮件开发信", tip: "主题写收益点（交期/认证/价格），首封不超过150词，附1张规格图。" },
  { channel: "Google Maps", tip: "按城市+关键词搜 fabricator/contractor，记录官网与邮箱进线索库。" },
];

/** 计算未来 N 天内即将到来的市场节日（用于工作台/资料库提醒） */
export function getUpcomingHolidays(withinDays = 45): Array<MarketHoliday & { date: string; inDays: number }> {
  const now = new Date();
  const year = now.getFullYear();
  const today = new Date(year, now.getMonth(), now.getDate());

  return MARKET_HOLIDAYS.map((h) => {
    const [m, d] = h.monthDay.split("-").map(Number);
    let date = new Date(year, m - 1, d);
    if (date < today) date = new Date(year + 1, m - 1, d);
    const inDays = Math.round((date.getTime() - today.getTime()) / (24 * 3600 * 1000));
    return { ...h, date: date.toISOString().slice(0, 10), inDays };
  })
    .filter((h) => h.inDays <= withinDays)
    .sort((a, b) => a.inDays - b.inDays);
}
