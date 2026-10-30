-- 有负责人但还没人用过的线索回到公海。
-- 已经联系过，或已经转成客户的，保留原负责人。客户表不动。
UPDATE "export_leads"
SET "owner_id" = NULL,
    "claimed_at" = NULL
WHERE "owner_id" IS NOT NULL
  AND "contact_count" = 0
  AND "last_contact_at" IS NULL
  AND "converted_to_customer_id" IS NULL;
