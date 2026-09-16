-- CreateTable
CREATE TABLE "export_projects" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "country" TEXT,
    "city" TEXT,
    "location" TEXT,
    "product_need" TEXT,
    "description" TEXT,
    "source" TEXT,
    "tender_url" TEXT,
    "status" TEXT NOT NULL DEFAULT 'hunting',
    "bid_deadline" TIMESTAMP(3),
    "owner_id" TEXT,
    "created_by_id" TEXT NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "export_projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "export_project_parties" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "company_name" TEXT NOT NULL,
    "country" TEXT,
    "website" TEXT,
    "contact_name" TEXT,
    "contact_title" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "whatsapp" TEXT,
    "linkedin" TEXT,
    "notes" TEXT,
    "found_by_id" TEXT NOT NULL,
    "lead_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "export_project_parties_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "export_projects_tenant_id_idx" ON "export_projects"("tenant_id");
CREATE INDEX "export_projects_owner_id_idx" ON "export_projects"("owner_id");
CREATE INDEX "export_projects_status_idx" ON "export_projects"("status");
CREATE INDEX "export_projects_country_idx" ON "export_projects"("country");
CREATE INDEX "export_projects_created_at_idx" ON "export_projects"("created_at");

-- CreateIndex
CREATE INDEX "export_project_parties_tenant_id_idx" ON "export_project_parties"("tenant_id");
CREATE INDEX "export_project_parties_project_id_idx" ON "export_project_parties"("project_id");
CREATE INDEX "export_project_parties_found_by_id_idx" ON "export_project_parties"("found_by_id");
CREATE INDEX "export_project_parties_lead_id_idx" ON "export_project_parties"("lead_id");

-- AddForeignKey
ALTER TABLE "export_projects" ADD CONSTRAINT "export_projects_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "export_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "export_projects" ADD CONSTRAINT "export_projects_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "export_projects" ADD CONSTRAINT "export_projects_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "export_project_parties" ADD CONSTRAINT "export_project_parties_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "export_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "export_project_parties" ADD CONSTRAINT "export_project_parties_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "export_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "export_project_parties" ADD CONSTRAINT "export_project_parties_found_by_id_fkey" FOREIGN KEY ("found_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "export_project_parties" ADD CONSTRAINT "export_project_parties_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "export_leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;
