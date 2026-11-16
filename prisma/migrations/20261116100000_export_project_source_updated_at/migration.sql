-- 资料更新时间。和 progress_mark、updated_at 分开。空着表示这条还没被标成「已更新」。
ALTER TABLE "export_projects" ADD COLUMN IF NOT EXISTS "source_updated_at" TIMESTAMP(3);
