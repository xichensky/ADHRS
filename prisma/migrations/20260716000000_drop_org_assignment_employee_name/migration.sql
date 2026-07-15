-- The employee name is now owned solely by basic_info (the personal-data infotype).
-- adhrsEmployees.name is synced from the current basic_info row by
-- setBasicInfoCurrentVersion (see src/lib/versioning/basicInfo.ts). The
-- denormalized employeeName snapshot on the org-assignment version is therefore
-- no longer needed and is dropped.
ALTER TABLE "adhrs_employee_org_assignment" DROP COLUMN "employeeName";
