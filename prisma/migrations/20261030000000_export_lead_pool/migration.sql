-- 外贸线索公海：负责人为空表示尚未认领
ALTER TABLE "export_leads" ALTER COLUMN "owner_id" DROP NOT NULL;
ALTER TABLE "export_leads" ADD COLUMN "claimed_at" TIMESTAMP(3);
CREATE INDEX "export_leads_claimed_at_idx" ON "export_leads"("claimed_at");

-- 已有负责人的线索保持私有，并补上认领时间，避免被当成公海
UPDATE "export_leads"
SET "claimed_at" = "created_at"
WHERE "owner_id" IS NOT NULL AND "claimed_at" IS NULL;

CREATE TABLE "export_lead_claims" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "lead_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "export_lead_claims_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "export_lead_claims_tenant_id_user_id_created_at_idx" ON "export_lead_claims"("tenant_id", "user_id", "created_at");

ALTER TABLE "export_lead_claims" ADD CONSTRAINT "export_lead_claims_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "export_leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "export_lead_claims" ADD CONSTRAINT "export_lead_claims_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
