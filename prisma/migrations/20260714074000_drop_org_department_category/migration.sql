-- Drop stale organization version field that is no longer exposed by the product UI/API.
ALTER TABLE "adhrs_organization_versions" DROP COLUMN "departmentCategory";
