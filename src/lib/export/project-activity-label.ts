const BODYLESS_KINDS = new Set(["claim", "assign", "progress", "stage", "status", "next_follow_up"]);

/** 项目动作的中文说明。详情页和今日日志共用，不带项目名。 */
export function projectActivityLabel(kind: string, content?: string | null) {
  const text = content?.trim() ?? "";
  switch (kind) {
    case "claim":
      return "认领项目";
    case "assign":
      return text ? `分配项目给${text}` : "收回项目分配";
    case "progress":
      return text ? `进度标记改为${text}` : "更新进度标记";
    case "stage":
      return text ? `阶段改为${text}` : "变更阶段";
    case "status":
      return text || "变更跟进状态";
    case "source_update":
      return "更新项目资料";
    case "follow_up":
      return "项目跟进";
    case "next_follow_up":
      return text ? `下次跟进定在${text}` : "清除下次跟进日期";
    default:
      return "项目变更";
  }
}

/** 跟进、资料更新这类动作的 content 是正文，要原样显示。 */
export function projectActivityHasBody(kind: string) {
  return !BODYLESS_KINDS.has(kind);
}
