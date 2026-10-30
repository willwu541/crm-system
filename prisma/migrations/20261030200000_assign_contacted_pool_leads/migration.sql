-- 已经联系过却还在公海的线索，归给最近一次真正跟进的人。深挖不算联系。
WITH latest AS (
  SELECT DISTINCT ON (a."lead_id")
    a."lead_id",
    a."owner_id" AS "user_id",
    a."tenant_id",
    a."created_at"
  FROM "export_activities" a
  INNER JOIN "export_leads" l ON l."id" = a."lead_id"
  WHERE a."lead_id" IS NOT NULL
    AND a."type" <> 'research'
    AND l."owner_id" IS NULL
    AND l."converted_to_customer_id" IS NULL
    AND l."status" <> 'converted'
    AND (l."last_contact_at" IS NOT NULL OR l."contact_count" > 0)
  ORDER BY a."lead_id", a."created_at" DESC
),
updated AS (
  UPDATE "export_leads" AS l
  SET "owner_id" = latest."user_id",
      "claimed_at" = COALESCE(l."claimed_at", latest."created_at")
  FROM latest
  WHERE l."id" = latest."lead_id"
  RETURNING l."id", l."tenant_id", l."owner_id", l."claimed_at"
)
INSERT INTO "export_lead_claims" ("id", "tenant_id", "lead_id", "user_id", "created_at")
SELECT gen_random_uuid()::text, u."tenant_id", u."id", u."owner_id", COALESCE(u."claimed_at", CURRENT_TIMESTAMP)
FROM updated u
WHERE NOT EXISTS (
  SELECT 1 FROM "export_lead_claims" c WHERE c."lead_id" = u."id"
);
