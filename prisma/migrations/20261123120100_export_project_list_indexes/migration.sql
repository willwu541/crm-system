CREATE INDEX IF NOT EXISTS "export_projects_tenant_id_progress_mark_idx" ON "export_projects"("tenant_id", "progress_mark");
CREATE INDEX IF NOT EXISTS "export_projects_tenant_id_source_updated_at_idx" ON "export_projects"("tenant_id", "source_updated_at");
CREATE INDEX IF NOT EXISTS "export_projects_tenant_id_owner_id_idx" ON "export_projects"("tenant_id", "owner_id");
CREATE INDEX IF NOT EXISTS "export_project_parties_tenant_id_company_name_idx" ON "export_project_parties"("tenant_id", "company_name");
