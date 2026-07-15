-- AlterTable
ALTER TABLE "adhrs_employee_bank_account" ADD COLUMN "expiration_date" DATETIME;

-- AlterTable
ALTER TABLE "adhrs_employee_social_security" ADD COLUMN "expiration_date" DATETIME;

-- CreateTable
CREATE TABLE "adhrs_employee_compensation" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "employee_id" INTEGER NOT NULL,
    "employee_version_id" INTEGER,
    "bank_account_id" INTEGER,
    "currency_id" INTEGER,
    "pay_type" TEXT,
    "pay_grade" TEXT,
    "pay_level" TEXT,
    "base_salary" DECIMAL,
    "allowances" JSONB,
    "effective_date" DATETIME NOT NULL,
    "expiration_date" DATETIME,
    "current_version" BOOLEAN NOT NULL DEFAULT false,
    "attachment" JSONB,
    "deletedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdBy" INTEGER,
    "updatedBy" INTEGER,
    "tenantId" INTEGER,
    CONSTRAINT "adhrs_employee_compensation_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "adhrs_employees" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "adhrs_employee_compensation_employee_version_id_fkey" FOREIGN KEY ("employee_version_id") REFERENCES "adhrs_employee_versions" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "adhrs_employee_compensation_bank_account_id_fkey" FOREIGN KEY ("bank_account_id") REFERENCES "adhrs_employee_bank_account" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "adhrs_employee_compensation_currency_id_fkey" FOREIGN KEY ("currency_id") REFERENCES "currency" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "adhrs_employee_family_member" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "employee_id" INTEGER NOT NULL,
    "id_document_type_id" INTEGER,
    "name" TEXT NOT NULL,
    "relationship" TEXT,
    "gender" TEXT,
    "birth_date" DATETIME,
    "id_document_number" TEXT,
    "is_dependent" BOOLEAN NOT NULL DEFAULT false,
    "cohabiting" BOOLEAN NOT NULL DEFAULT false,
    "employer" TEXT,
    "phone" TEXT,
    "deletedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdBy" INTEGER,
    "updatedBy" INTEGER,
    "tenantId" INTEGER,
    CONSTRAINT "adhrs_employee_family_member_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "adhrs_employees" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "adhrs_employee_family_member_id_document_type_id_fkey" FOREIGN KEY ("id_document_type_id") REFERENCES "id_document_type" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "adhrs_employee_emergency_contact" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "employee_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "relationship" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdBy" INTEGER,
    "updatedBy" INTEGER,
    "tenantId" INTEGER,
    CONSTRAINT "adhrs_employee_emergency_contact_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "adhrs_employees" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "adhrs_employee_certificate" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "employee_id" INTEGER NOT NULL,
    "country_id" INTEGER,
    "type" TEXT,
    "name" TEXT,
    "number" TEXT,
    "issue_date" DATETIME,
    "expiry_date" DATETIME,
    "issuing_authority" TEXT,
    "attachment" JSONB,
    "deletedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdBy" INTEGER,
    "updatedBy" INTEGER,
    "tenantId" INTEGER,
    CONSTRAINT "adhrs_employee_certificate_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "adhrs_employees" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "adhrs_employee_certificate_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "country" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_adhrs_employee_education_background" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "employee_id" INTEGER NOT NULL,
    "degree" TEXT,
    "major" TEXT,
    "minor" TEXT,
    "school_name" TEXT,
    "start_date" DATETIME,
    "end_date" DATETIME,
    "deletedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdBy" INTEGER,
    "updatedBy" INTEGER,
    "tenantId" INTEGER,
    CONSTRAINT "adhrs_employee_education_background_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "adhrs_employees" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_adhrs_employee_education_background" ("createdAt", "createdBy", "degree", "deletedAt", "employee_id", "end_date", "id", "major", "minor", "school_name", "start_date", "tenantId", "updatedAt", "updatedBy") SELECT "createdAt", "createdBy", "degree", "deletedAt", "employee_id", "end_date", "id", "major", "minor", "school_name", "start_date", "tenantId", "updatedAt", "updatedBy" FROM "adhrs_employee_education_background";
DROP TABLE "adhrs_employee_education_background";
ALTER TABLE "new_adhrs_employee_education_background" RENAME TO "adhrs_employee_education_background";
CREATE TABLE "new_adhrs_employee_person" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "employee_id" INTEGER NOT NULL,
    "employee_version_id" INTEGER,
    "name" TEXT NOT NULL,
    "local_language_name" TEXT,
    "gender" TEXT,
    "birth_date" DATETIME,
    "email" TEXT,
    "mobile_phone" TEXT,
    "home_tel" TEXT,
    "id_document_type_id" INTEGER,
    "id_document_number" TEXT,
    "id_document_address" TEXT,
    "country_id" INTEGER,
    "province" TEXT,
    "city" TEXT,
    "district" TEXT,
    "home_address_details" TEXT,
    "mailing_address" TEXT,
    "hukou_location" TEXT,
    "place_of_birth" TEXT,
    "marital_status" TEXT,
    "health_status" TEXT,
    "degree" TEXT,
    "photo_url" TEXT,
    "nationality" TEXT,
    "emergency_contact_name" TEXT,
    "emergency_contact_phone" TEXT,
    "emergency_contact_relationship" TEXT,
    "current_version" BOOLEAN NOT NULL DEFAULT false,
    "effectiveDate" DATETIME NOT NULL,
    "expirationDate" DATETIME,
    "deletedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdBy" INTEGER,
    "updatedBy" INTEGER,
    "tenantId" INTEGER,
    CONSTRAINT "adhrs_employee_person_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "adhrs_employees" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "adhrs_employee_person_employee_version_id_fkey" FOREIGN KEY ("employee_version_id") REFERENCES "adhrs_employee_versions" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "adhrs_employee_person_id_document_type_id_fkey" FOREIGN KEY ("id_document_type_id") REFERENCES "id_document_type" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "adhrs_employee_person_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "country" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_adhrs_employee_person" ("birth_date", "city", "country_id", "createdAt", "createdBy", "current_version", "degree", "deletedAt", "district", "effectiveDate", "email", "emergency_contact_name", "emergency_contact_phone", "emergency_contact_relationship", "employee_id", "employee_version_id", "gender", "health_status", "home_address_details", "home_tel", "hukou_location", "id", "id_document_address", "id_document_number", "id_document_type_id", "local_language_name", "mailing_address", "marital_status", "mobile_phone", "name", "place_of_birth", "province", "tenantId", "updatedAt", "updatedBy") SELECT "birth_date", "city", "country_id", "createdAt", "createdBy", "current_version", "degree", "deletedAt", "district", "effectiveDate", "email", "emergency_contact_name", "emergency_contact_phone", "emergency_contact_relationship", "employee_id", "employee_version_id", "gender", "health_status", "home_address_details", "home_tel", "hukou_location", "id", "id_document_address", "id_document_number", "id_document_type_id", "local_language_name", "mailing_address", "marital_status", "mobile_phone", "name", "place_of_birth", "province", "tenantId", "updatedAt", "updatedBy" FROM "adhrs_employee_person";
DROP TABLE "adhrs_employee_person";
ALTER TABLE "new_adhrs_employee_person" RENAME TO "adhrs_employee_person";
CREATE INDEX "adhrs_employee_person_employee_id_current_version_idx" ON "adhrs_employee_person"("employee_id", "current_version");
CREATE INDEX "adhrs_employee_person_id_document_number_idx" ON "adhrs_employee_person"("id_document_number");
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
INSERT INTO "new_adhrs_employee_versions" ("createdAt", "createdBy", "current_version", "deletedAt", "effectiveDate", "employeeId", "employeeName", "employment_type", "expirationDate", "functionalLeaderEmployeeId", "id", "managing_people_or_not", "office_location", "office_location_id", "operationalLeaderEmployeeId", "orgId", "positionId", "reportToEmployeeId", "secondaryPositionId", "tenantId", "updatedAt", "updatedBy", "versionDiff", "work_location", "work_location_id") SELECT "createdAt", "createdBy", "current_version", "deletedAt", "effectiveDate", "employeeId", "employeeName", "employment_type", "expirationDate", "functionalLeaderEmployeeId", "id", "managing_people_or_not", "office_location", "office_location_id", "operationalLeaderEmployeeId", "orgId", "positionId", "reportToEmployeeId", "secondaryPositionId", "tenantId", "updatedAt", "updatedBy", "versionDiff", "work_location", "work_location_id" FROM "adhrs_employee_versions";
DROP TABLE "adhrs_employee_versions";
ALTER TABLE "new_adhrs_employee_versions" RENAME TO "adhrs_employee_versions";
CREATE INDEX "adhrs_employee_versions_employeeId_current_version_idx" ON "adhrs_employee_versions"("employeeId", "current_version");
CREATE INDEX "adhrs_employee_versions_effectiveDate_idx" ON "adhrs_employee_versions"("effectiveDate");
CREATE UNIQUE INDEX "adhrs_employee_versions_employeeId_effectiveDate_key" ON "adhrs_employee_versions"("employeeId", "effectiveDate");
CREATE TABLE "new_adhrs_employee_work_experience" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "employee_id" INTEGER NOT NULL,
    "company_name" TEXT,
    "job_title" TEXT,
    "start_date" DATETIME,
    "end_date" DATETIME,
    "leave_reason" TEXT,
    "deletedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdBy" INTEGER,
    "updatedBy" INTEGER,
    "tenantId" INTEGER,
    CONSTRAINT "adhrs_employee_work_experience_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "adhrs_employees" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_adhrs_employee_work_experience" ("company_name", "createdAt", "createdBy", "deletedAt", "employee_id", "end_date", "id", "job_title", "leave_reason", "start_date", "tenantId", "updatedAt", "updatedBy") SELECT "company_name", "createdAt", "createdBy", "deletedAt", "employee_id", "end_date", "id", "job_title", "leave_reason", "start_date", "tenantId", "updatedAt", "updatedBy" FROM "adhrs_employee_work_experience";
DROP TABLE "adhrs_employee_work_experience";
ALTER TABLE "new_adhrs_employee_work_experience" RENAME TO "adhrs_employee_work_experience";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "adhrs_employee_compensation_employee_id_current_version_idx" ON "adhrs_employee_compensation"("employee_id", "current_version");

-- CreateIndex
CREATE UNIQUE INDEX "adhrs_employee_compensation_employee_id_effective_date_key" ON "adhrs_employee_compensation"("employee_id", "effective_date");

-- CreateIndex
CREATE INDEX "adhrs_employee_family_member_employee_id_idx" ON "adhrs_employee_family_member"("employee_id");

-- CreateIndex
CREATE INDEX "adhrs_employee_emergency_contact_employee_id_idx" ON "adhrs_employee_emergency_contact"("employee_id");

-- CreateIndex
CREATE INDEX "adhrs_employee_certificate_employee_id_expiry_date_idx" ON "adhrs_employee_certificate"("employee_id", "expiry_date");

