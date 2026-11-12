-- 项目跟进进度标记。和 status（hunting/abandoned）分开。
ALTER TABLE "export_projects" ADD COLUMN IF NOT EXISTS "progress_mark" TEXT;
