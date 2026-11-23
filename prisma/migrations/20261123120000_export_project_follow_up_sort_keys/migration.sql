-- 下次跟进日期；金额（万元）和完工年月的数值列，供列表筛选排序。旧数据用 scripts/backfill-project-sort-keys.mjs 回填。
ALTER TABLE "export_projects" ADD COLUMN IF NOT EXISTS "next_follow_up_at" TIMESTAMP(3);
ALTER TABLE "export_projects" ADD COLUMN IF NOT EXISTS "project_value_wan" DOUBLE PRECISION;
ALTER TABLE "export_projects" ADD COLUMN IF NOT EXISTS "schedule_end_key" INTEGER;

CREATE INDEX IF NOT EXISTS "export_projects_tenant_id_next_follow_up_at_idx" ON "export_projects"("tenant_id", "next_follow_up_at");
CREATE INDEX IF NOT EXISTS "export_projects_tenant_id_project_value_wan_idx" ON "export_projects"("tenant_id", "project_value_wan");
CREATE INDEX IF NOT EXISTS "export_projects_tenant_id_schedule_end_key_idx" ON "export_projects"("tenant_id", "schedule_end_key");
