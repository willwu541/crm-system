export interface SopLeadInput {
  id: string;
  companyName: string;
  contactCount: number;
  lastContactAt: Date | null;
  createdAt: Date;
}

export interface SopSuggestion {
  category: "first_touch" | "followup_1" | "followup_2" | "followup_3" | "long_tail";
  title: string;
  dueInDays: number;
  note: string;
}

function daysSince(date: Date): number {
  return Math.floor((Date.now() - date.getTime()) / (24 * 3600 * 1000));
}

export function getLeadSopSuggestion(lead: SopLeadInput): SopSuggestion | null {
  if (!lead.lastContactAt) {
    const age = daysSince(lead.createdAt);
    if (lead.contactCount === 0 && age >= 2) {
      return {
        category: "first_touch",
        title: `[SOP] 首轮开发触达：${lead.companyName}`,
        dueInDays: 0,
        note: "线索创建后 2 天仍未触达，建议发送首封开发信或 WhatsApp 触达。",
      };
    }
    return null;
  }

  const days = daysSince(lead.lastContactAt);
  if (lead.contactCount === 1 && days >= 3) {
    return {
      category: "followup_1",
      title: `[SOP] 第2轮跟进：${lead.companyName}`,
      dueInDays: 0,
      note: "距首次联系已 >=3 天，建议发送 Follow-up #1。",
    };
  }
  if (lead.contactCount === 2 && days >= 7) {
    return {
      category: "followup_2",
      title: `[SOP] 第3轮跟进：${lead.companyName}`,
      dueInDays: 0,
      note: "距上次联系已 >=7 天，建议发送 Follow-up #2。",
    };
  }
  if (lead.contactCount === 3 && days >= 14) {
    return {
      category: "followup_3",
      title: `[SOP] 第4轮跟进：${lead.companyName}`,
      dueInDays: 0,
      note: "距上次联系已 >=14 天，建议发送 Follow-up #3。",
    };
  }
  if (lead.contactCount >= 4 && days >= 30) {
    return {
      category: "long_tail",
      title: `[SOP] 长尾唤醒跟进：${lead.companyName}`,
      dueInDays: 0,
      note: "距上次联系已 >=30 天，建议进入长尾唤醒节奏。",
    };
  }

  return null;
}

