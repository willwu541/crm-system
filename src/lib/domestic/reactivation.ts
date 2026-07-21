/** 默认超过 30 天未联系视为需私域唤醒 */
export const DEFAULT_DORMANT_DAYS = 30;

export function getDormantThresholdDate(days = DEFAULT_DORMANT_DAYS): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function daysSinceContact(lastContactAt: Date | null, fallback: Date): number {
  const ref = lastContactAt ?? fallback;
  return Math.floor((Date.now() - ref.getTime()) / (24 * 3600 * 1000));
}

export interface ReactivationSuggestion {
  priority: "high" | "medium" | "low";
  message: string;
  channel: "wechat" | "phone" | "both";
}

export function getReactivationSuggestion(input: {
  name: string;
  wechat: string | null;
  daysSilent: number;
  wakeUpCount: number;
}): ReactivationSuggestion {
  const hasWechat = Boolean(input.wechat?.trim());

  if (input.daysSilent >= 90) {
    return {
      priority: "high",
      message: `${input.name} 已沉默 ${input.daysSilent} 天，建议优先通过微信私域发送关怀消息并电话确认需求。`,
      channel: hasWechat ? "both" : "phone",
    };
  }

  if (input.daysSilent >= 60 || input.wakeUpCount === 0) {
    return {
      priority: "medium",
      message: `${input.name} 建议发送产品/案例更新，询问近期项目进展。`,
      channel: hasWechat ? "wechat" : "phone",
    };
  }

  return {
    priority: "low",
    message: `${input.name} 可进行常规私域触达，保持联系频率。`,
    channel: hasWechat ? "wechat" : "phone",
  };
}
