-- 管理者 AI：线索进度标记、客户分析。不改业务员备注。
ALTER TABLE "export_leads" ADD COLUMN IF NOT EXISTS "progress_mark" TEXT;
ALTER TABLE "export_customers" ADD COLUMN IF NOT EXISTS "ai_analysis" TEXT;
