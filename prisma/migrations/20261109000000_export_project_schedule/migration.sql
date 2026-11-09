ALTER TABLE "export_projects" ADD COLUMN IF NOT EXISTS "schedule_status" TEXT;
ALTER TABLE "export_projects" ADD COLUMN IF NOT EXISTS "schedule_start" TEXT;
ALTER TABLE "export_projects" ADD COLUMN IF NOT EXISTS "schedule_end" TEXT;
ALTER TABLE "export_projects" ADD COLUMN IF NOT EXISTS "tender_deadline" TEXT;
ALTER TABLE "export_projects" ADD COLUMN IF NOT EXISTS "tender_opening" TEXT;
ALTER TABLE "export_projects" ADD COLUMN IF NOT EXISTS "contractor_state" TEXT;
ALTER TABLE "export_projects" ADD COLUMN IF NOT EXISTS "appointment_method" TEXT;
ALTER TABLE "export_project_parties" ADD COLUMN IF NOT EXISTS "role_status" TEXT;
