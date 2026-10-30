-- 找线索的人不是负责人。还没转成客户、也没有业务员认领记录的线索回到公海。
-- 联系方式、深挖记录不算开发。已经认领或已转成客户的保持原负责人。
UPDATE "export_leads" AS l
SET "owner_id" = NULL,
    "claimed_at" = NULL
WHERE l."owner_id" IS NOT NULL
  AND l."converted_to_customer_id" IS NULL
  AND l."status" <> 'converted'
  AND NOT EXISTS (
    SELECT 1 FROM "export_lead_claims" c WHERE c."lead_id" = l."id"
  );
