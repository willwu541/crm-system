"use client";

import {
  buildLeadSocialLinks,
  type SocialChannel,
  type SocialLinkItem,
} from "@/lib/export/social-links";

const CHANNEL_STYLE: Record<SocialChannel, string> = {
  email: "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100",
  phone: "border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200",
  whatsapp: "border-green-200 bg-green-50 text-green-800 hover:bg-green-100",
  linkedin: "border-blue-200 bg-blue-50 text-blue-800 hover:bg-blue-100",
  facebook: "border-indigo-200 bg-indigo-50 text-indigo-800 hover:bg-indigo-100",
  tiktok: "border-pink-200 bg-pink-50 text-pink-800 hover:bg-pink-100",
};

export function SocialLinksBar({
  email,
  phone,
  whatsapp,
  linkedin,
  facebook,
  tiktok,
  onChannelClick,
  compact,
}: {
  email?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  linkedin?: string | null;
  facebook?: string | null;
  tiktok?: string | null;
  onChannelClick?: (channel: SocialChannel) => void;
  compact?: boolean;
}) {
  const links = buildLeadSocialLinks({ email, phone, whatsapp, linkedin, facebook, tiktok });
  if (links.length === 0) {
    return <span className="text-xs text-slate-400">未填写联系方式</span>;
  }

  return (
    <div className={`flex flex-wrap gap-2 ${compact ? "" : "mt-1"}`}>
      {links.map((item) => (
        <SocialLinkButton key={item.channel} item={item} onChannelClick={onChannelClick} />
      ))}
    </div>
  );
}

function SocialLinkButton({
  item,
  onChannelClick,
}: {
  item: SocialLinkItem;
  onChannelClick?: (channel: SocialChannel) => void;
}) {
  const cls = CHANNEL_STYLE[item.channel];
  if (onChannelClick) {
    return (
      <button
        type="button"
        onClick={() => onChannelClick(item.channel)}
        className={`rounded-md border px-2.5 py-1 text-xs font-medium ${cls}`}
        title={item.raw}
      >
        {item.label}
      </button>
    );
  }
  return (
    <a
      href={item.href}
      target="_blank"
      rel="noreferrer"
      className={`rounded-md border px-2.5 py-1 text-xs font-medium ${cls}`}
      title={item.raw}
    >
      {item.label}
    </a>
  );
}
