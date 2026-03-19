-- Export CRM Structure V2 Migration
-- 数据隔离、字段优化、明细表、编号规则

-- 1. 创建 ExportTenant 表
CREATE TABLE IF NOT EXISTS "export_tenants" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "export_tenants_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "export_tenants_slug_key" ON "export_tenants"("slug");

-- 2. 创建 ExportSequence 表
CREATE TABLE IF NOT EXISTS "export_sequences" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "prefix" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "last_seq" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "export_sequences_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "export_sequences_tenant_id_prefix_year_key" ON "export_sequences"("tenant_id", "prefix", "year");
CREATE INDEX IF NOT EXISTS "export_sequences_tenant_id_idx" ON "export_sequences"("tenant_id");

ALTER TABLE "export_sequences" ADD CONSTRAINT "export_sequences_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "export_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 3. 插入默认 tenant（如不存在）
INSERT INTO "export_tenants" ("id", "name", "slug", "created_at", "updated_at")
SELECT gen_random_uuid()::text, 'Default Export', 'default', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "export_tenants" WHERE slug = 'default');

-- 4. User 表增加 tenant_id
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "tenant_id" TEXT;
UPDATE "users" u SET "tenant_id" = (SELECT id FROM "export_tenants" WHERE slug = 'default' LIMIT 1) WHERE u."tenant" = 'export' AND u."tenant_id" IS NULL;
ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_tenant_id_fkey";
ALTER TABLE "users" ADD CONSTRAINT "users_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "export_tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 5. 获取默认 tenant id 供后续使用（使用子查询）
-- ExportLead: 添加 tenant_id 及新字段
ALTER TABLE "export_leads" ADD COLUMN IF NOT EXISTS "tenant_id" TEXT;
UPDATE "export_leads" SET "tenant_id" = (SELECT id FROM "export_tenants" WHERE slug = 'default' LIMIT 1) WHERE "tenant_id" IS NULL;
ALTER TABLE "export_leads" ALTER COLUMN "tenant_id" SET NOT NULL;

ALTER TABLE "export_leads" ADD COLUMN IF NOT EXISTS "last_contact_at" TIMESTAMP(3);
ALTER TABLE "export_leads" ADD COLUMN IF NOT EXISTS "is_duplicate" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "export_leads" ADD COLUMN IF NOT EXISTS "duplicate_reason" TEXT;

-- interested_products: String -> String[] (text -> text[])
ALTER TABLE "export_leads" ADD COLUMN IF NOT EXISTS "interested_products_new" TEXT[];
UPDATE "export_leads" SET "interested_products_new" = 
  CASE 
    WHEN "interested_products" IS NULL OR "interested_products" = '' THEN '{}'
    ELSE string_to_array(trim("interested_products"), ',')
  END;
ALTER TABLE "export_leads" DROP COLUMN IF EXISTS "interested_products";
ALTER TABLE "export_leads" RENAME COLUMN "interested_products_new" TO "interested_products";

ALTER TABLE "export_leads" DROP CONSTRAINT IF EXISTS "export_leads_tenant_id_fkey";
ALTER TABLE "export_leads" ADD CONSTRAINT "export_leads_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "export_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX IF NOT EXISTS "export_leads_tenant_id_idx" ON "export_leads"("tenant_id");
CREATE INDEX IF NOT EXISTS "export_leads_owner_id_idx" ON "export_leads"("owner_id");
CREATE INDEX IF NOT EXISTS "export_leads_status_idx" ON "export_leads"("status");
CREATE INDEX IF NOT EXISTS "export_leads_created_at_idx" ON "export_leads"("created_at");

-- 6. ExportCustomer
ALTER TABLE "export_customers" ADD COLUMN IF NOT EXISTS "tenant_id" TEXT;
UPDATE "export_customers" SET "tenant_id" = (SELECT id FROM "export_tenants" WHERE slug = 'default' LIMIT 1) WHERE "tenant_id" IS NULL;
ALTER TABLE "export_customers" ALTER COLUMN "tenant_id" SET NOT NULL;

ALTER TABLE "export_customers" ADD COLUMN IF NOT EXISTS "last_stage_changed_at" TIMESTAMP(3);
ALTER TABLE "export_customers" ADD COLUMN IF NOT EXISTS "lost_reason" TEXT;

ALTER TABLE "export_customers" ADD COLUMN IF NOT EXISTS "interested_products_new" TEXT[];
UPDATE "export_customers" SET "interested_products_new" = 
  CASE 
    WHEN "interested_products" IS NULL OR "interested_products" = '' THEN '{}'
    ELSE string_to_array(trim("interested_products"), ',')
  END;
ALTER TABLE "export_customers" DROP COLUMN IF EXISTS "interested_products";
ALTER TABLE "export_customers" RENAME COLUMN "interested_products_new" TO "interested_products";

DROP INDEX IF EXISTS "export_customers_customer_code_key";
CREATE UNIQUE INDEX IF NOT EXISTS "export_customers_tenant_id_customer_code_key" ON "export_customers"("tenant_id", "customer_code");
ALTER TABLE "export_customers" DROP CONSTRAINT IF EXISTS "export_customers_tenant_id_fkey";
ALTER TABLE "export_customers" ADD CONSTRAINT "export_customers_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "export_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX IF NOT EXISTS "export_customers_tenant_id_idx" ON "export_customers"("tenant_id");
CREATE INDEX IF NOT EXISTS "export_customers_owner_id_idx" ON "export_customers"("owner_id");
CREATE INDEX IF NOT EXISTS "export_customers_status_idx" ON "export_customers"("status");
CREATE INDEX IF NOT EXISTS "export_customers_created_at_idx" ON "export_customers"("created_at");

-- 7. ExportContact
ALTER TABLE "export_contacts" ADD COLUMN IF NOT EXISTS "tenant_id" TEXT;
UPDATE "export_contacts" c SET "tenant_id" = (SELECT "tenant_id" FROM "export_customers" WHERE id = c."customer_id" LIMIT 1) WHERE c."tenant_id" IS NULL;
-- 若 customer 已删，用 default tenant
UPDATE "export_contacts" SET "tenant_id" = (SELECT id FROM "export_tenants" WHERE slug = 'default' LIMIT 1) WHERE "tenant_id" IS NULL;
ALTER TABLE "export_contacts" ALTER COLUMN "tenant_id" SET NOT NULL;

ALTER TABLE "export_contacts" DROP CONSTRAINT IF EXISTS "export_contacts_tenant_id_fkey";
ALTER TABLE "export_contacts" ADD CONSTRAINT "export_contacts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "export_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX IF NOT EXISTS "export_contacts_tenant_id_idx" ON "export_contacts"("tenant_id");
CREATE INDEX IF NOT EXISTS "export_contacts_customer_id_idx" ON "export_contacts"("customer_id");

-- 8. ExportActivity
ALTER TABLE "export_activities" ADD COLUMN IF NOT EXISTS "tenant_id" TEXT;
UPDATE "export_activities" a SET "tenant_id" = (SELECT "tenant_id" FROM "export_customers" WHERE id = a."customer_id" LIMIT 1) WHERE a."tenant_id" IS NULL;
UPDATE "export_activities" SET "tenant_id" = (SELECT id FROM "export_tenants" WHERE slug = 'default' LIMIT 1) WHERE "tenant_id" IS NULL;
ALTER TABLE "export_activities" ALTER COLUMN "tenant_id" SET NOT NULL;

ALTER TABLE "export_activities" ADD COLUMN IF NOT EXISTS "customer_name_snapshot" TEXT;
ALTER TABLE "export_activities" ADD COLUMN IF NOT EXISTS "contact_name_snapshot" TEXT;
ALTER TABLE "export_activities" ADD COLUMN IF NOT EXISTS "contact_email_snapshot" TEXT;

ALTER TABLE "export_activities" DROP CONSTRAINT IF EXISTS "export_activities_tenant_id_fkey";
ALTER TABLE "export_activities" ADD CONSTRAINT "export_activities_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "export_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX IF NOT EXISTS "export_activities_tenant_id_idx" ON "export_activities"("tenant_id");
CREATE INDEX IF NOT EXISTS "export_activities_owner_id_idx" ON "export_activities"("owner_id");
CREATE INDEX IF NOT EXISTS "export_activities_customer_id_idx" ON "export_activities"("customer_id");
CREATE INDEX IF NOT EXISTS "export_activities_created_at_idx" ON "export_activities"("created_at");

-- 9. ExportQuote
ALTER TABLE "export_quotes" ADD COLUMN IF NOT EXISTS "tenant_id" TEXT;
UPDATE "export_quotes" q SET "tenant_id" = (SELECT "tenant_id" FROM "export_customers" WHERE id = q."customer_id" LIMIT 1) WHERE q."tenant_id" IS NULL;
UPDATE "export_quotes" SET "tenant_id" = (SELECT id FROM "export_tenants" WHERE slug = 'default' LIMIT 1) WHERE "tenant_id" IS NULL;
ALTER TABLE "export_quotes" ALTER COLUMN "tenant_id" SET NOT NULL;

DROP INDEX IF EXISTS "export_quotes_quote_no_key";
CREATE UNIQUE INDEX IF NOT EXISTS "export_quotes_tenant_id_quote_no_key" ON "export_quotes"("tenant_id", "quote_no");
ALTER TABLE "export_quotes" DROP CONSTRAINT IF EXISTS "export_quotes_tenant_id_fkey";
ALTER TABLE "export_quotes" ADD CONSTRAINT "export_quotes_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "export_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX IF NOT EXISTS "export_quotes_tenant_id_idx" ON "export_quotes"("tenant_id");
CREATE INDEX IF NOT EXISTS "export_quotes_customer_id_idx" ON "export_quotes"("customer_id");
CREATE INDEX IF NOT EXISTS "export_quotes_created_at_idx" ON "export_quotes"("created_at");

-- 10. ExportQuoteItem (新表)
CREATE TABLE IF NOT EXISTS "export_quote_items" (
    "id" TEXT NOT NULL,
    "quote_id" TEXT NOT NULL,
    "product_type" TEXT NOT NULL,
    "spec" TEXT,
    "description" TEXT,
    "quantity" DECIMAL(18,4) NOT NULL,
    "unit" TEXT NOT NULL,
    "unit_price" DECIMAL(18,4) NOT NULL,
    "amount" DECIMAL(18,4) NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "export_quote_items_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "export_quote_items_quote_id_idx" ON "export_quote_items"("quote_id");
ALTER TABLE "export_quote_items" ADD CONSTRAINT "export_quote_items_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "export_quotes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 11. ExportOrder
ALTER TABLE "export_orders" ADD COLUMN IF NOT EXISTS "tenant_id" TEXT;
UPDATE "export_orders" o SET "tenant_id" = (SELECT "tenant_id" FROM "export_customers" WHERE id = o."customer_id" LIMIT 1) WHERE o."tenant_id" IS NULL;
UPDATE "export_orders" SET "tenant_id" = (SELECT id FROM "export_tenants" WHERE slug = 'default' LIMIT 1) WHERE "tenant_id" IS NULL;
ALTER TABLE "export_orders" ALTER COLUMN "tenant_id" SET NOT NULL;

DROP INDEX IF EXISTS "export_orders_order_no_key";
CREATE UNIQUE INDEX IF NOT EXISTS "export_orders_tenant_id_order_no_key" ON "export_orders"("tenant_id", "order_no");
ALTER TABLE "export_orders" DROP CONSTRAINT IF EXISTS "export_orders_tenant_id_fkey";
ALTER TABLE "export_orders" ADD CONSTRAINT "export_orders_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "export_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX IF NOT EXISTS "export_orders_tenant_id_idx" ON "export_orders"("tenant_id");
CREATE INDEX IF NOT EXISTS "export_orders_customer_id_idx" ON "export_orders"("customer_id");
CREATE INDEX IF NOT EXISTS "export_orders_created_at_idx" ON "export_orders"("created_at");

-- 12. ExportOrderItem (新表)
CREATE TABLE IF NOT EXISTS "export_order_items" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "product_type" TEXT NOT NULL,
    "spec" TEXT,
    "description" TEXT,
    "quantity" DECIMAL(18,4) NOT NULL,
    "unit" TEXT NOT NULL,
    "unit_price" DECIMAL(18,4) NOT NULL,
    "amount" DECIMAL(18,4) NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "export_order_items_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "export_order_items_order_id_idx" ON "export_order_items"("order_id");
ALTER TABLE "export_order_items" ADD CONSTRAINT "export_order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "export_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 13. ExportTask
ALTER TABLE "export_tasks" ADD COLUMN IF NOT EXISTS "tenant_id" TEXT;
UPDATE "export_tasks" t SET "tenant_id" = COALESCE((SELECT "tenant_id" FROM "export_customers" WHERE id = t."customer_id" LIMIT 1), (SELECT id FROM "export_tenants" WHERE slug = 'default' LIMIT 1)) WHERE t."tenant_id" IS NULL;
UPDATE "export_tasks" SET "tenant_id" = (SELECT id FROM "export_tenants" WHERE slug = 'default' LIMIT 1) WHERE "tenant_id" IS NULL;
ALTER TABLE "export_tasks" ALTER COLUMN "tenant_id" SET NOT NULL;

ALTER TABLE "export_tasks" DROP CONSTRAINT IF EXISTS "export_tasks_tenant_id_fkey";
ALTER TABLE "export_tasks" ADD CONSTRAINT "export_tasks_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "export_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX IF NOT EXISTS "export_tasks_tenant_id_idx" ON "export_tasks"("tenant_id");
CREATE INDEX IF NOT EXISTS "export_tasks_owner_id_idx" ON "export_tasks"("owner_id");
CREATE INDEX IF NOT EXISTS "export_tasks_customer_id_idx" ON "export_tasks"("customer_id");
CREATE INDEX IF NOT EXISTS "export_tasks_due_date_idx" ON "export_tasks"("due_date");
CREATE INDEX IF NOT EXISTS "export_tasks_created_at_idx" ON "export_tasks"("created_at");
