-- OrgAssignment: event-driven timeline (入转调离).
-- The event type + reason now live on the version row itself (SAP PA-Actions /
-- 用友 "异动" model), making each任职版本 self-describing. The vestigial
-- adhrs_employee_change_record table is dropped — its only signal (Onboard,
-- written once per employee at hire) is migrated onto the version first.

-- 1. Add the two event columns (nullable; required-ness enforced in the trigger layer).
ALTER TABLE "adhrs_employee_org_assignment" ADD COLUMN "event_type" TEXT;
ALTER TABLE "adhrs_employee_org_assignment" ADD COLUMN "event_reason" TEXT;

-- 2. Backfill: carry the only existing event signal (Onboard) onto the version row.
UPDATE "adhrs_employee_org_assignment"
SET "event_type" = 'Onboard'
WHERE "id" IN (SELECT "employee_version_id" FROM "adhrs_employee_change_record");

-- 2b. Safety net: any version still untagged → Other (no information loss, no NULLs left ambiguous).
UPDATE "adhrs_employee_org_assignment" SET "event_type" = 'Other' WHERE "event_type" IS NULL;

-- 3. Drop the now-redundant change_record table (event has moved to the version row).
PRAGMA foreign_keys=off;
DROP TABLE "adhrs_employee_change_record";
PRAGMA foreign_keys=on;

-- 4. Drop versionDiff — declared on the three version tables but never written by any code path.
ALTER TABLE "adhrs_employee_org_assignment" DROP COLUMN "versionDiff";
ALTER TABLE "adhrs_organization_versions" DROP COLUMN "versionDiff";
ALTER TABLE "adhrs_position_versions" DROP COLUMN "versionDiff";
