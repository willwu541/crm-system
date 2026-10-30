-- 管理者分配的线索单独记一笔，不占用业务员每天的认领额度。
ALTER TABLE "export_lead_claims" ADD COLUMN "assigned_by_id" TEXT;

ALTER TABLE "export_lead_claims"
  ADD CONSTRAINT "export_lead_claims_assigned_by_id_fkey"
  FOREIGN KEY ("assigned_by_id") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
