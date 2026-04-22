/**
 * 将 Prisma / 数据库错误转为前端可展示的中文说明
 */
export function prismaErrorToUserMessage(e: unknown, fallback: string): string {
  const raw = e instanceof Error ? e.message : String(e);
  const lower = raw.toLowerCase();

  if (
    lower.includes("product_interest") ||
    lower.includes("interested_products") ||
    lower.includes("export_deletion_logs") ||
    (lower.includes("column") && lower.includes("does not exist")) ||
    (lower.includes("unknown arg") && lower.includes("productinterest"))
  ) {
    return "数据库表结构与程序不一致。请在服务器进入项目目录执行：npx prisma db push（或 npx prisma migrate deploy），然后重启应用。";
  }

  if (raw.includes("P2002") || lower.includes("unique constraint")) {
    return "数据重复或冲突，请检查是否已存在相同记录。";
  }

  if (
    lower.includes("foreign key") ||
    lower.includes("violates foreign key") ||
    raw.includes("P2003")
  ) {
    return "关联数据无效（例如负责人不存在），请刷新页面后重试。";
  }

  return fallback;
}
