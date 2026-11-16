CREATE TABLE IF NOT EXISTS "export_project_activities" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "content" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "export_project_activities_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "export_project_activities_tenant_id_created_at_idx" ON "export_project_activities"("tenant_id", "created_at");
CREATE INDEX IF NOT EXISTS "export_project_activities_project_id_created_at_idx" ON "export_project_activities"("project_id", "created_at");
CREATE INDEX IF NOT EXISTS "export_project_activities_user_id_created_at_idx" ON "export_project_activities"("user_id", "created_at");

DO $$ BEGIN
  ALTER TABLE "export_project_activities"
    ADD CONSTRAINT "export_project_activities_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "export_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "export_project_activities"
    ADD CONSTRAINT "export_project_activities_project_id_fkey"
    FOREIGN KEY ("project_id") REFERENCES "export_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "export_project_activities"
    ADD CONSTRAINT "export_project_activities_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
