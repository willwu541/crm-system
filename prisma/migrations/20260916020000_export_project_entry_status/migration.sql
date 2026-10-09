-- AlterTable
ALTER TABLE "export_projects" ADD COLUMN IF NOT EXISTS "entry_status" TEXT NOT NULL DEFAULT 'entered';

CREATE INDEX IF NOT EXISTS "export_projects_entry_status_idx" ON "export_projects"("entry_status");
