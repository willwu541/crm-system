import { prisma } from "./prisma";

export async function createOpLog(params: {
  action: string;
  targetType: string;
  targetId: string;
  targetName: string;
  userId: string;
  userName: string;
  details?: string;
}) {
  try {
    await prisma.operationLog.create({
      data: {
        action: params.action,
        targetType: params.targetType,
        targetId: params.targetId,
        targetName: params.targetName,
        userId: params.userId,
        userName: params.userName,
        details: params.details ?? null,
      },
    });
  } catch (e) {
    console.error("Create op log error:", e);
  }
}
