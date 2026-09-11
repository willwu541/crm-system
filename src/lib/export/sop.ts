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
    if (lead.contactCount === 0 && age >= 1) {
      return {
        category: "first_touch",
        title: `[SOP] 首轮开发触达：${lead.companyName}`,
        dueInDays: 0,
        note: "尚未首次联系",
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
        note: "确认正确联系人",
    };
  }
  if (lead.contactCount === 2 && days >= 7) {
    return {
      category: "followup_2",
      title: `[SOP] 第3轮跟进：${lead.companyName}`,
      dueInDays: 0,
        note: "补一个具体问题",
    };
  }
  if (lead.contactCount === 3 && days >= 12) {
    return {
      category: "followup_3",
      title: `[SOP] 第4轮跟进：${lead.companyName}`,
      dueInDays: 0,
        note: "最后确认采购范围",
    };
  }
  if (lead.contactCount >= 4 && days >= 30) {
    return {
      category: "long_tail",
      title: `[SOP] 长尾唤醒跟进：${lead.companyName}`,
      dueInDays: 0,
        note: "长尾唤醒",
    };
  }

  return null;
}

