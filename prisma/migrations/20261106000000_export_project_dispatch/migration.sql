-- 快速录入并派发：项目号、第一问、实际采购回填
ALTER TABLE "export_projects" ADD COLUMN IF NOT EXISTS "source_project_number" TEXT;
ALTER TABLE "export_projects" ADD COLUMN IF NOT EXISTS "known_scope" TEXT;
ALTER TABLE "export_projects" ADD COLUMN IF NOT EXISTS "need_to_verify" TEXT;
ALTER TABLE "export_projects" ADD COLUMN IF NOT EXISTS "ask_for_role" TEXT;
ALTER TABLE "export_projects" ADD COLUMN IF NOT EXISTS "next_step" TEXT;
ALTER TABLE "export_projects" ADD COLUMN IF NOT EXISTS "feedback_due_at" TIMESTAMP(3);
ALTER TABLE "export_projects" ADD COLUMN IF NOT EXISTS "demand_status" TEXT NOT NULL DEFAULT '需求待核实';
ALTER TABLE "export_projects" ADD COLUMN IF NOT EXISTS "actual_buyer_company" TEXT;
ALTER TABLE "export_projects" ADD COLUMN IF NOT EXISTS "actual_buyer_contact" TEXT;
ALTER TABLE "export_projects" ADD COLUMN IF NOT EXISTS "purchase_progress" TEXT;

-- 同一租户的 LeadManager 项目号只能有一条。空号不占位，PostgreSQL 唯一索引允许多个 NULL。
CREATE UNIQUE INDEX IF NOT EXISTS "export_projects_tenant_id_source_project_number_key"
  ON "export_projects"("tenant_id", "source_project_number");
