-- AlterTable
ALTER TABLE "export_leads" ADD COLUMN IF NOT EXISTS "fit_evidence" TEXT;
ALTER TABLE "export_leads" ADD COLUMN IF NOT EXISTS "last_outcome" TEXT;

-- AlterTable
ALTER TABLE "export_customers" ADD COLUMN IF NOT EXISTS "fit_evidence" TEXT;
ALTER TABLE "export_customers" ADD COLUMN IF NOT EXISTS "last_outcome" TEXT;

-- AlterTable
ALTER TABLE "export_activities" ADD COLUMN IF NOT EXISTS "outcome" TEXT;
