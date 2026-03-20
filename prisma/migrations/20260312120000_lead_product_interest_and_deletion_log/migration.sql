-- Lead: interested_products (text[]) -> product_interest (text)
ALTER TABLE "export_leads" ADD COLUMN IF NOT EXISTS "product_interest" TEXT;
UPDATE "export_leads"
SET "product_interest" = array_to_string("interested_products", ', ')
WHERE "interested_products" IS NOT NULL AND cardinality("interested_products") > 0;
ALTER TABLE "export_leads" DROP COLUMN IF EXISTS "interested_products";

-- 外贸删除审计
CREATE TABLE IF NOT EXISTS "export_deletion_logs" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "record_id" TEXT NOT NULL,
    "summary" TEXT,
    "snapshot" JSONB NOT NULL,
    "deleted_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "export_deletion_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "export_deletion_logs_tenant_id_idx" ON "export_deletion_logs"("tenant_id");
CREATE INDEX IF NOT EXISTS "export_deletion_logs_entity_type_idx" ON "export_deletion_logs"("entity_type");
CREATE INDEX IF NOT EXISTS "export_deletion_logs_created_at_idx" ON "export_deletion_logs"("created_at");

ALTER TABLE "export_deletion_logs" DROP CONSTRAINT IF EXISTS "export_deletion_logs_deleted_by_id_fkey";
ALTER TABLE "export_deletion_logs" ADD CONSTRAINT "export_deletion_logs_deleted_by_id_fkey" FOREIGN KEY ("deleted_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
