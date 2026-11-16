-- 取消暂缓开发时恢复原先状态。状态本身仍用已有的 parked。
ALTER TABLE "export_leads" ADD COLUMN IF NOT EXISTS "parked_from_status" TEXT;
ALTER TABLE "export_projects" ADD COLUMN IF NOT EXISTS "parked_from_status" TEXT;
