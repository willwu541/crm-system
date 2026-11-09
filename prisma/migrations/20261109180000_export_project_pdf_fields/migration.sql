-- PDF 结构字段：金额、工程状态、地区、用地、总包是否披露；环节资料角色与地址；钢格板相关建材
ALTER TABLE "export_projects" ADD COLUMN IF NOT EXISTS "project_value_text" TEXT;
ALTER TABLE "export_projects" ADD COLUMN IF NOT EXISTS "project_value_original" TEXT;
ALTER TABLE "export_projects" ADD COLUMN IF NOT EXISTS "project_status_raw" TEXT;
ALTER TABLE "export_projects" ADD COLUMN IF NOT EXISTS "region" TEXT;
ALTER TABLE "export_projects" ADD COLUMN IF NOT EXISTS "site_area" TEXT;
ALTER TABLE "export_projects" ADD COLUMN IF NOT EXISTS "contractor_listed" TEXT;
ALTER TABLE "export_projects" ADD COLUMN IF NOT EXISTS "grating_related_elements" TEXT;
ALTER TABLE "export_project_parties" ADD COLUMN IF NOT EXISTS "company_role" TEXT;
ALTER TABLE "export_project_parties" ADD COLUMN IF NOT EXISTS "address" TEXT;
