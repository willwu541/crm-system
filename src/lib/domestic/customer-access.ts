import type { SessionUser } from "@/lib/auth";

export function customerOwnerFilter(user: SessionUser) {
  // SALES: 只能看自己的
  // MANAGER: 看团队所有人的（暂简化为看全部内贸客户）
  // ADMIN: 看全部
  return user.role === "SALES" ? { ownerId: user.id } : {};
}

export function isAdminOrManager(user: SessionUser) {
  return user.role === "ADMIN" || user.role === "MANAGER";
}

export const CUSTOMER_STATUS_LABELS: Record<string, string> = {
  ACTIVE: "活跃",
  DORMANT: "沉睡",
  AWAKENING: "唤醒中",
  LOST: "已流失",
};

export const ANALYSIS_STATUS_LABELS: Record<string, string> = {
  PENDING: "待分析",
  PROCESSING: "分析中",
  COMPLETED: "已完成",
  FAILED: "分析失败",
};

export const SENTIMENT_LABELS: Record<string, string> = {
  positive: "积极",
  neutral: "中性",
  negative: "消极",
};
