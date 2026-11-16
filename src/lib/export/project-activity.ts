import type { SessionUser } from "@/lib/auth";
import { projectStageLabel, projectStatusLabel } from "@/lib/export-display-labels";
import { PROJECT_ABANDONED_STATUS } from "@/lib/export-constants";
import { canAssignExportWork } from "@/lib/export/lead-pool";

export type ProjectActivityKind =
  | "claim"
  | "assign"
  | "progress"
  | "stage"
  | "status"
  | "source_update"
  | "follow_up";

export type PlannedProjectActivity = {
  kind: ProjectActivityKind;
  content: string | null;
};

/** 负责人，以及能分配项目的管理者，可以改标记、写跟进。未分配时业务员不行。 */
export function canMarkExportProject(
  user: Pick<SessionUser, "id" | "role">,
  ownerId?: string | null,
) {
  if (canAssignExportWork(user)) return true;
  return Boolean(ownerId && ownerId === user.id);
}

export function projectCreatedVerb(input: {
  source?: string | null;
  sourceProjectNumber?: string | null;
}) {
  const source = (input.source ?? "").toLowerCase();
  const imported =
    Boolean(input.sourceProjectNumber?.trim()) ||
    source.includes("leadmanager") ||
    source.includes("hubexo");
  return imported ? "导入项目" : "录入项目";
}

function stageText(stage: string) {
  return projectStageLabel[stage] ?? stage;
}

function statusText(status: string) {
  return projectStatusLabel[status] ?? status;
}

/** 一次保存里实际发生变化的项目动作。跟进正文另记，不进这里。 */
export function planProjectActivities(input: {
  prev: {
    stage: string;
    status: string;
    progressMark: string | null;
    ownerId: string | null;
  };
  next: {
    stage?: string;
    status?: string;
    progressMark?: string;
    ownerId?: string | null;
    updateNote?: string;
  };
  assigneeName?: string | null;
}): PlannedProjectActivity[] {
  const events: PlannedProjectActivity[] = [];
  const note = input.next.updateNote?.trim();
  if (note) {
    events.push({ kind: "source_update", content: note });
  }
  if (input.next.stage !== undefined && input.next.stage !== input.prev.stage) {
    events.push({ kind: "stage", content: stageText(input.next.stage) });
  }
  if (input.next.status !== undefined && input.next.status !== input.prev.status) {
    let content = `跟进状态改为${statusText(input.next.status)}`;
    if (input.next.status === PROJECT_ABANDONED_STATUS) content = "标为废弃";
    else if (input.prev.status === PROJECT_ABANDONED_STATUS) content = "取消废弃";
    events.push({ kind: "status", content });
  }
  if (
    input.next.progressMark !== undefined &&
    input.next.progressMark !== (input.prev.progressMark ?? "")
  ) {
    events.push({ kind: "progress", content: input.next.progressMark });
  }
  if (input.next.ownerId !== undefined && input.next.ownerId !== input.prev.ownerId) {
    events.push({ kind: "assign", content: input.assigneeName?.trim() || null });
  }
  return events;
}
