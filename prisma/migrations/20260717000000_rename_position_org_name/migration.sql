-- Rename the `name` column on the position/org master + version tables to
-- disambiguate from other `name` fields (employee, dictionaries, etc.).
-- Data-preserving RENAME COLUMN (SQLite >= 3.25); the @@index([name]) indexes
-- are recreated so their physical names match the renamed fields.
ALTER TABLE "adhrs_organizations" RENAME COLUMN "name" TO "orgName";
ALTER TABLE "adhrs_organization_versions" RENAME COLUMN "name" TO "orgName";
ALTER TABLE "adhrs_positions" RENAME COLUMN "name" TO "positionName";
ALTER TABLE "adhrs_position_versions" RENAME COLUMN "name" TO "positionName";

DROP INDEX "adhrs_organizations_name_idx";
CREATE INDEX "adhrs_organizations_orgName_idx" ON "adhrs_organizations"("orgName");
DROP INDEX "adhrs_positions_name_idx";
CREATE INDEX "adhrs_positions_positionName_idx" ON "adhrs_positions"("positionName");
