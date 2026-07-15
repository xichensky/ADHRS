-- AlterTable
ALTER TABLE "adhrs_contract" ADD COLUMN "tenantId" INTEGER;

-- AlterTable
ALTER TABLE "adhrs_contract_seq" ADD COLUMN "tenantId" INTEGER;

-- AlterTable
ALTER TABLE "adhrs_employee_bank_account" ADD COLUMN "tenantId" INTEGER;

-- AlterTable
ALTER TABLE "adhrs_employee_change_record" ADD COLUMN "tenantId" INTEGER;

-- AlterTable
ALTER TABLE "adhrs_employee_contract_person_relation" ADD COLUMN "tenantId" INTEGER;

-- AlterTable
ALTER TABLE "adhrs_employee_education_background" ADD COLUMN "tenantId" INTEGER;

-- AlterTable
ALTER TABLE "adhrs_employee_person" ADD COLUMN "tenantId" INTEGER;

-- AlterTable
ALTER TABLE "adhrs_employee_social_security" ADD COLUMN "tenantId" INTEGER;

-- AlterTable
ALTER TABLE "adhrs_employee_version_payment_final_approver_relation" ADD COLUMN "tenantId" INTEGER;

-- AlterTable
ALTER TABLE "adhrs_employee_work_experience" ADD COLUMN "tenantId" INTEGER;

-- AlterTable
ALTER TABLE "adhrs_employees" ADD COLUMN "deletedAt" DATETIME;
ALTER TABLE "adhrs_employees" ADD COLUMN "tenantId" INTEGER;

-- AlterTable
ALTER TABLE "adhrs_hrs_cms_contract_type_realtion" ADD COLUMN "tenantId" INTEGER;

-- AlterTable
ALTER TABLE "adhrs_hrs_cms_legal_entity_realtion" ADD COLUMN "tenantId" INTEGER;

-- AlterTable
ALTER TABLE "adhrs_legal_entity" ADD COLUMN "tenantId" INTEGER;

-- AlterTable
ALTER TABLE "adhrs_legal_entity_contract_relation" ADD COLUMN "tenantId" INTEGER;

-- AlterTable
ALTER TABLE "adhrs_organizations" ADD COLUMN "deletedAt" DATETIME;
ALTER TABLE "adhrs_organizations" ADD COLUMN "tenantId" INTEGER;

-- AlterTable
ALTER TABLE "adhrs_position_versions" ADD COLUMN "deletedAt" DATETIME;
ALTER TABLE "adhrs_position_versions" ADD COLUMN "tenantId" INTEGER;

-- AlterTable
ALTER TABLE "adhrs_positions" ADD COLUMN "deletedAt" DATETIME;
ALTER TABLE "adhrs_positions" ADD COLUMN "tenantId" INTEGER;

-- AlterTable
ALTER TABLE "adhrs_system_state" ADD COLUMN "tenantId" INTEGER;

-- CreateTable
CREATE TABLE "adhrs_code_seq" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "codeType" TEXT NOT NULL,
    "prefix" TEXT NOT NULL,
    "lastSeq" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdBy" INTEGER,
    "updatedBy" INTEGER,
    "deletedAt" DATETIME,
    "tenantId" INTEGER
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_adhrs_employee_versions" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "employeeId" INTEGER NOT NULL,
    "employeeName" TEXT NOT NULL,
    "orgId" INTEGER,
    "positionId" INTEGER,
    "secondaryPositionId" INTEGER,
    "reportToEmployeeId" INTEGER,
    "operationalLeaderEmployeeId" INTEGER,
    "functionalLeaderEmployeeId" INTEGER,
    "office_location" TEXT,
    "work_location" TEXT,
    "office_location_id" INTEGER,
    "work_location_id" INTEGER,
    "employment_type" TEXT,
    "managing_people_or_not" BOOLEAN NOT NULL DEFAULT false,
    "effectiveDate" DATETIME NOT NULL,
    "expirationDate" DATETIME,
    "current_version" BOOLEAN NOT NULL DEFAULT false,
    "schedule" BOOLEAN NOT NULL DEFAULT false,
    "versionDiff" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdBy" INTEGER,
    "updatedBy" INTEGER,
    "deletedAt" DATETIME,
    "tenantId" INTEGER,
    CONSTRAINT "adhrs_employee_versions_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "adhrs_employees" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "adhrs_employee_versions_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "adhrs_organizations" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "adhrs_employee_versions_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "adhrs_positions" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "adhrs_employee_versions_secondaryPositionId_fkey" FOREIGN KEY ("secondaryPositionId") REFERENCES "adhrs_positions" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "adhrs_employee_versions_reportToEmployeeId_fkey" FOREIGN KEY ("reportToEmployeeId") REFERENCES "adhrs_employees" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "adhrs_employee_versions_operationalLeaderEmployeeId_fkey" FOREIGN KEY ("operationalLeaderEmployeeId") REFERENCES "adhrs_employees" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "adhrs_employee_versions_functionalLeaderEmployeeId_fkey" FOREIGN KEY ("functionalLeaderEmployeeId") REFERENCES "adhrs_employees" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "adhrs_employee_versions_office_location_id_fkey" FOREIGN KEY ("office_location_id") REFERENCES "location" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "adhrs_employee_versions_work_location_id_fkey" FOREIGN KEY ("work_location_id") REFERENCES "location" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_adhrs_employee_versions" ("createdAt", "createdBy", "current_version", "effectiveDate", "employeeId", "employeeName", "employment_type", "expirationDate", "functionalLeaderEmployeeId", "id", "managing_people_or_not", "office_location", "operationalLeaderEmployeeId", "orgId", "positionId", "reportToEmployeeId", "schedule", "secondaryPositionId", "updatedAt", "updatedBy", "versionDiff", "work_location") SELECT "createdAt", "createdBy", "current_version", "effectiveDate", "employeeId", "employeeName", "employment_type", "expirationDate", "functionalLeaderEmployeeId", "id", "managing_people_or_not", "office_location", "operationalLeaderEmployeeId", "orgId", "positionId", "reportToEmployeeId", "schedule", "secondaryPositionId", "updatedAt", "updatedBy", "versionDiff", "work_location" FROM "adhrs_employee_versions";
DROP TABLE "adhrs_employee_versions";
ALTER TABLE "new_adhrs_employee_versions" RENAME TO "adhrs_employee_versions";
CREATE INDEX "adhrs_employee_versions_employeeId_current_version_idx" ON "adhrs_employee_versions"("employeeId", "current_version");
CREATE INDEX "adhrs_employee_versions_effectiveDate_idx" ON "adhrs_employee_versions"("effectiveDate");
CREATE UNIQUE INDEX "adhrs_employee_versions_employeeId_effectiveDate_key" ON "adhrs_employee_versions"("employeeId", "effectiveDate");
CREATE TABLE "new_adhrs_organization_versions" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "orgId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "orgType" TEXT,
    "parentOrgId" INTEGER,
    "effectiveDate" DATETIME NOT NULL,
    "expirationDate" DATETIME,
    "current_version" BOOLEAN NOT NULL DEFAULT false,
    "versionDiff" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdBy" INTEGER,
    "updatedBy" INTEGER,
    "deletedAt" DATETIME,
    "tenantId" INTEGER,
    CONSTRAINT "adhrs_organization_versions_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "adhrs_organizations" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "adhrs_organization_versions_parentOrgId_fkey" FOREIGN KEY ("parentOrgId") REFERENCES "adhrs_organizations" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_adhrs_organization_versions" ("createdAt", "createdBy", "current_version", "effectiveDate", "expirationDate", "id", "name", "orgId", "orgType", "parentOrgId", "updatedAt", "updatedBy", "versionDiff") SELECT "createdAt", "createdBy", "current_version", "effectiveDate", "expirationDate", "id", "name", "orgId", "orgType", "parentOrgId", "updatedAt", "updatedBy", "versionDiff" FROM "adhrs_organization_versions";
DROP TABLE "adhrs_organization_versions";
ALTER TABLE "new_adhrs_organization_versions" RENAME TO "adhrs_organization_versions";
CREATE INDEX "adhrs_organization_versions_orgId_current_version_idx" ON "adhrs_organization_versions"("orgId", "current_version");
CREATE INDEX "adhrs_organization_versions_effectiveDate_idx" ON "adhrs_organization_versions"("effectiveDate");
CREATE INDEX "adhrs_organization_versions_parentOrgId_idx" ON "adhrs_organization_versions"("parentOrgId");
CREATE UNIQUE INDEX "adhrs_organization_versions_orgId_effectiveDate_key" ON "adhrs_organization_versions"("orgId", "effectiveDate");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "adhrs_code_seq_codeType_prefix_key" ON "adhrs_code_seq"("codeType", "prefix");

-- CreateIndex
CREATE INDEX "adhrs_employee_person_id_document_number_idx" ON "adhrs_employee_person"("id_document_number");

-- CreateIndex
CREATE INDEX "adhrs_employee_social_security_sscn_idx" ON "adhrs_employee_social_security"("sscn");

-- CreateIndex
CREATE INDEX "adhrs_position_versions_parentPositionId_idx" ON "adhrs_position_versions"("parentPositionId");

-- CreateIndex
CREATE UNIQUE INDEX "adhrs_position_versions_positionId_effectiveDate_key" ON "adhrs_position_versions"("positionId", "effectiveDate");
