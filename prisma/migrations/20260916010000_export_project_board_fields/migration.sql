-- AlterTable
ALTER TABLE "export_projects" ADD COLUMN IF NOT EXISTS "industry" TEXT;
ALTER TABLE "export_projects" ADD COLUMN IF NOT EXISTS "stage" TEXT NOT NULL DEFAULT 'unknown';
ALTER TABLE "export_projects" ADD COLUMN IF NOT EXISTS "confidence" TEXT NOT NULL DEFAULT 'unknown';
ALTER TABLE "export_projects" ADD COLUMN IF NOT EXISTS "owner_operator" TEXT;
ALTER TABLE "export_projects" ADD COLUMN IF NOT EXISTS "general_contractor" TEXT;
ALTER TABLE "export_projects" ADD COLUMN IF NOT EXISTS "potential_buyers" TEXT;

CREATE INDEX IF NOT EXISTS "export_projects_stage_idx" ON "export_projects"("stage");
CREATE INDEX IF NOT EXISTS "export_projects_industry_idx" ON "export_projects"("industry");
