/** 规范化社媒/通讯链接，供列表「一键打开」 */

export type SocialChannel = "phone" | "whatsapp" | "linkedin" | "facebook" | "tiktok" | "email";

export interface SocialLinkItem {
  channel: SocialChannel;
  label: string;
  href: string;
  raw: string;
}

function trim(v?: string | null): string {
  return (v ?? "").trim();
}

export function normalizeWhatsappUrl(value?: string | null): string | null {
  const raw = trim(value);
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw)) return raw;
  const digits = raw.replace(/[^\d+]/g, "");
  if (!digits) return null;
  return `https://wa.me/${digits.replace(/^\+/, "")}`;
}

export function normalizeLinkedInUrl(value?: string | null): string | null {
  const raw = trim(value);
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.includes("linkedin.com")) return `https://${raw.replace(/^\/\//, "")}`;
  return `https://www.linkedin.com/in/${raw.replace(/^@/, "")}`;
}

export function normalizeFacebookUrl(value?: string | null): string | null {
  const raw = trim(value);
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw)) return raw;
  const handle = raw.replace(/^@/, "");
  if (raw.includes("facebook.com")) return `https://${raw.replace(/^\/\//, "")}`;
  return `https://www.facebook.com/${handle}`;
}

export function normalizeTikTokUrl(value?: string | null): string | null {
  const raw = trim(value);
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw)) return raw;
  const handle = raw.replace(/^@/, "");
  if (raw.includes("tiktok.com")) return `https://${raw.replace(/^\/\//, "")}`;
  return `https://www.tiktok.com/@${handle}`;
}

export function buildMailtoUrl(email?: string | null, subject?: string, body?: string): string | null {
  const addr = trim(email);
  if (!addr) return null;
  const params = new URLSearchParams();
  if (subject) params.set("subject", subject);
  if (body) params.set("body", body);
  const q = params.toString();
  return q ? `mailto:${addr}?${q}` : `mailto:${addr}`;
}

export function buildLeadSocialLinks(input: {
  email?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  linkedin?: string | null;
  facebook?: string | null;
  tiktok?: string | null;
}): SocialLinkItem[] {
  const links: SocialLinkItem[] = [];
  const email = trim(input.email);
  if (email) {
    const href = buildMailtoUrl(email);
    if (href) links.push({ channel: "email", label: "邮件", href, raw: email });
  }
  const phone = trim(input.phone);
  if (phone) {
    links.push({ channel: "phone", label: "电话", href: `tel:${phone}`, raw: phone });
  }
  // 仅在明确填写了 WhatsApp 时显示 WhatsApp，避免与电话混淆
  const wa = normalizeWhatsappUrl(input.whatsapp);
  if (wa) {
    links.push({
      channel: "whatsapp",
      label: "WhatsApp",
      href: wa,
      raw: input.whatsapp || "",
    });
  }
  const li = normalizeLinkedInUrl(input.linkedin);
  if (li) links.push({ channel: "linkedin", label: "LinkedIn", href: li, raw: input.linkedin! });
  const fb = normalizeFacebookUrl(input.facebook);
  if (fb) links.push({ channel: "facebook", label: "Facebook", href: fb, raw: input.facebook! });
  const tt = normalizeTikTokUrl(input.tiktok);
  if (tt) links.push({ channel: "tiktok", label: "TikTok", href: tt, raw: input.tiktok! });
  return links;
}

export function defaultActivityTypeForChannel(channel: SocialChannel): string {
  switch (channel) {
    case "phone":
      return "call";
    case "whatsapp":
      return "whatsapp";
    case "linkedin":
      return "linkedin";
    case "facebook":
      return "facebook";
    case "tiktok":
      return "tiktok";
    default:
      return "email";
  }
}
