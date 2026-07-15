-- DropIndex
DROP INDEX "adhrs_employee_person_id_document_number_idx";

-- DropIndex
DROP INDEX "adhrs_employee_person_employee_id_current_version_idx";

-- DropIndex
DROP INDEX "adhrs_employee_version_payment_final_approver_relation_employee_version_id_approver_employee_id_key";

-- DropIndex
DROP INDEX "adhrs_employee_versions_employeeId_effectiveDate_key";

-- DropIndex
DROP INDEX "adhrs_employee_versions_effectiveDate_idx";

-- DropIndex
DROP INDEX "adhrs_employee_versions_employeeId_current_version_idx";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "adhrs_employee_person";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "adhrs_employee_version_payment_final_approver_relation";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "adhrs_employee_versions";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "adhrs_employee_org_assignment" (
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
    "payment_final_approvers" JSONB,
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
    CONSTRAINT "adhrs_employee_org_assignment_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "adhrs_employees" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "adhrs_employee_org_assignment_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "adhrs_organizations" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "adhrs_employee_org_assignment_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "adhrs_positions" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "adhrs_employee_org_assignment_secondaryPositionId_fkey" FOREIGN KEY ("secondaryPositionId") REFERENCES "adhrs_positions" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "adhrs_employee_org_assignment_reportToEmployeeId_fkey" FOREIGN KEY ("reportToEmployeeId") REFERENCES "adhrs_employees" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "adhrs_employee_org_assignment_operationalLeaderEmployeeId_fkey" FOREIGN KEY ("operationalLeaderEmployeeId") REFERENCES "adhrs_employees" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "adhrs_employee_org_assignment_functionalLeaderEmployeeId_fkey" FOREIGN KEY ("functionalLeaderEmployeeId") REFERENCES "adhrs_employees" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "adhrs_employee_org_assignment_office_location_id_fkey" FOREIGN KEY ("office_location_id") REFERENCES "location" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "adhrs_employee_org_assignment_work_location_id_fkey" FOREIGN KEY ("work_location_id") REFERENCES "location" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "adhrs_employee_basic_info" (
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
    CONSTRAINT "adhrs_employee_basic_info_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "adhrs_employees" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "adhrs_employee_basic_info_employee_version_id_fkey" FOREIGN KEY ("employee_version_id") REFERENCES "adhrs_employee_org_assignment" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "adhrs_employee_basic_info_id_document_type_id_fkey" FOREIGN KEY ("id_document_type_id") REFERENCES "id_document_type" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "adhrs_employee_basic_info_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "country" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_adhrs_contract" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "conctract_no" TEXT NOT NULL,
    "contract_title" TEXT,
    "contract_type_id" INTEGER,
    "employee_id" INTEGER,
    "employee_version_id" INTEGER,
    "action_type" TEXT,
    "term_type" TEXT,
    "status" TEXT,
    "sign_date" DATETIME,
    "effective_date" DATETIME,
    "expire_date" DATETIME,
    "terminate_date" DATETIME,
    "contract_attachment" JSONB,
    "cms_contract_uuid" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdBy" INTEGER,
    "updatedBy" INTEGER,
    "deletedAt" DATETIME,
    "tenantId" INTEGER,
    CONSTRAINT "adhrs_contract_contract_type_id_fkey" FOREIGN KEY ("contract_type_id") REFERENCES "adhrs_hrs_contract_type" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "adhrs_contract_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "adhrs_employees" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "adhrs_contract_employee_version_id_fkey" FOREIGN KEY ("employee_version_id") REFERENCES "adhrs_employee_org_assignment" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_adhrs_contract" ("action_type", "cms_contract_uuid", "conctract_no", "contract_attachment", "contract_title", "contract_type_id", "createdAt", "createdBy", "deletedAt", "effective_date", "employee_id", "employee_version_id", "expire_date", "id", "sign_date", "status", "tenantId", "term_type", "terminate_date", "updatedAt", "updatedBy") SELECT "action_type", "cms_contract_uuid", "conctract_no", "contract_attachment", "contract_title", "contract_type_id", "createdAt", "createdBy", "deletedAt", "effective_date", "employee_id", "employee_version_id", "expire_date", "id", "sign_date", "status", "tenantId", "term_type", "terminate_date", "updatedAt", "updatedBy" FROM "adhrs_contract";
DROP TABLE "adhrs_contract";
ALTER TABLE "new_adhrs_contract" RENAME TO "adhrs_contract";
CREATE UNIQUE INDEX "adhrs_contract_conctract_no_key" ON "adhrs_contract"("conctract_no");
CREATE TABLE "new_adhrs_employee_bank_account" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "employee_id" INTEGER NOT NULL,
    "employee_version_id" INTEGER,
    "account_holder_name" TEXT NOT NULL,
    "bank_id" INTEGER,
    "currency_id" INTEGER,
    "country_id" INTEGER,
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
    CONSTRAINT "adhrs_employee_bank_account_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "adhrs_employees" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "adhrs_employee_bank_account_employee_version_id_fkey" FOREIGN KEY ("employee_version_id") REFERENCES "adhrs_employee_org_assignment" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "adhrs_employee_bank_account_bank_id_fkey" FOREIGN KEY ("bank_id") REFERENCES "bank" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "adhrs_employee_bank_account_currency_id_fkey" FOREIGN KEY ("currency_id") REFERENCES "currency" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "adhrs_employee_bank_account_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "country" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_adhrs_employee_bank_account" ("account_holder_name", "attachment", "bank_id", "country_id", "createdAt", "createdBy", "currency_id", "current_version", "deletedAt", "effective_date", "employee_id", "employee_version_id", "expiration_date", "id", "tenantId", "updatedAt", "updatedBy") SELECT "account_holder_name", "attachment", "bank_id", "country_id", "createdAt", "createdBy", "currency_id", "current_version", "deletedAt", "effective_date", "employee_id", "employee_version_id", "expiration_date", "id", "tenantId", "updatedAt", "updatedBy" FROM "adhrs_employee_bank_account";
DROP TABLE "adhrs_employee_bank_account";
ALTER TABLE "new_adhrs_employee_bank_account" RENAME TO "adhrs_employee_bank_account";
CREATE INDEX "adhrs_employee_bank_account_employee_id_current_version_idx" ON "adhrs_employee_bank_account"("employee_id", "current_version");
CREATE TABLE "new_adhrs_employee_change_record" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "employee_version_id" INTEGER NOT NULL,
    "employee_id" INTEGER,
    "change_type" TEXT,
    "deletedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdBy" INTEGER,
    "updatedBy" INTEGER,
    "tenantId" INTEGER,
    CONSTRAINT "adhrs_employee_change_record_employee_version_id_fkey" FOREIGN KEY ("employee_version_id") REFERENCES "adhrs_employee_org_assignment" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "adhrs_employee_change_record_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "adhrs_employees" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_adhrs_employee_change_record" ("change_type", "createdAt", "createdBy", "deletedAt", "employee_id", "employee_version_id", "id", "tenantId", "updatedAt", "updatedBy") SELECT "change_type", "createdAt", "createdBy", "deletedAt", "employee_id", "employee_version_id", "id", "tenantId", "updatedAt", "updatedBy" FROM "adhrs_employee_change_record";
DROP TABLE "adhrs_employee_change_record";
ALTER TABLE "new_adhrs_employee_change_record" RENAME TO "adhrs_employee_change_record";
CREATE TABLE "new_adhrs_employee_compensation" (
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
    CONSTRAINT "adhrs_employee_compensation_employee_version_id_fkey" FOREIGN KEY ("employee_version_id") REFERENCES "adhrs_employee_org_assignment" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "adhrs_employee_compensation_bank_account_id_fkey" FOREIGN KEY ("bank_account_id") REFERENCES "adhrs_employee_bank_account" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "adhrs_employee_compensation_currency_id_fkey" FOREIGN KEY ("currency_id") REFERENCES "currency" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_adhrs_employee_compensation" ("allowances", "attachment", "bank_account_id", "base_salary", "createdAt", "createdBy", "currency_id", "current_version", "deletedAt", "effective_date", "employee_id", "employee_version_id", "expiration_date", "id", "pay_grade", "pay_level", "pay_type", "tenantId", "updatedAt", "updatedBy") SELECT "allowances", "attachment", "bank_account_id", "base_salary", "createdAt", "createdBy", "currency_id", "current_version", "deletedAt", "effective_date", "employee_id", "employee_version_id", "expiration_date", "id", "pay_grade", "pay_level", "pay_type", "tenantId", "updatedAt", "updatedBy" FROM "adhrs_employee_compensation";
DROP TABLE "adhrs_employee_compensation";
ALTER TABLE "new_adhrs_employee_compensation" RENAME TO "adhrs_employee_compensation";
CREATE INDEX "adhrs_employee_compensation_employee_id_current_version_idx" ON "adhrs_employee_compensation"("employee_id", "current_version");
CREATE TABLE "new_adhrs_employee_contract_person_relation" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "employee_id" INTEGER NOT NULL,
    "employee_version_id" INTEGER,
    "contract_person_uuid" TEXT NOT NULL,
    "deletedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdBy" INTEGER,
    "updatedBy" INTEGER,
    "tenantId" INTEGER,
    CONSTRAINT "adhrs_employee_contract_person_relation_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "adhrs_employees" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "adhrs_employee_contract_person_relation_employee_version_id_fkey" FOREIGN KEY ("employee_version_id") REFERENCES "adhrs_employee_org_assignment" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_adhrs_employee_contract_person_relation" ("contract_person_uuid", "createdAt", "createdBy", "deletedAt", "employee_id", "employee_version_id", "id", "tenantId", "updatedAt", "updatedBy") SELECT "contract_person_uuid", "createdAt", "createdBy", "deletedAt", "employee_id", "employee_version_id", "id", "tenantId", "updatedAt", "updatedBy" FROM "adhrs_employee_contract_person_relation";
DROP TABLE "adhrs_employee_contract_person_relation";
ALTER TABLE "new_adhrs_employee_contract_person_relation" RENAME TO "adhrs_employee_contract_person_relation";
CREATE UNIQUE INDEX "adhrs_employee_contract_person_relation_contract_person_uuid_key" ON "adhrs_employee_contract_person_relation"("contract_person_uuid");
CREATE TABLE "new_adhrs_employee_social_security" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "employee_id" INTEGER NOT NULL,
    "employee_version_id" INTEGER,
    "sscn" TEXT,
    "hpf_account" TEXT,
    "title" TEXT,
    "spouse" TEXT,
    "spouse_id_number" TEXT,
    "first_time_to_check_social_insurance" BOOLEAN NOT NULL DEFAULT false,
    "effective_date" DATETIME NOT NULL,
    "expiration_date" DATETIME,
    "current_version" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdBy" INTEGER,
    "updatedBy" INTEGER,
    "tenantId" INTEGER,
    CONSTRAINT "adhrs_employee_social_security_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "adhrs_employees" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "adhrs_employee_social_security_employee_version_id_fkey" FOREIGN KEY ("employee_version_id") REFERENCES "adhrs_employee_org_assignment" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_adhrs_employee_social_security" ("createdAt", "createdBy", "current_version", "deletedAt", "effective_date", "employee_id", "employee_version_id", "expiration_date", "first_time_to_check_social_insurance", "hpf_account", "id", "spouse", "spouse_id_number", "sscn", "tenantId", "title", "updatedAt", "updatedBy") SELECT "createdAt", "createdBy", "current_version", "deletedAt", "effective_date", "employee_id", "employee_version_id", "expiration_date", "first_time_to_check_social_insurance", "hpf_account", "id", "spouse", "spouse_id_number", "sscn", "tenantId", "title", "updatedAt", "updatedBy" FROM "adhrs_employee_social_security";
DROP TABLE "adhrs_employee_social_security";
ALTER TABLE "new_adhrs_employee_social_security" RENAME TO "adhrs_employee_social_security";
CREATE INDEX "adhrs_employee_social_security_employee_id_current_version_idx" ON "adhrs_employee_social_security"("employee_id", "current_version");
CREATE INDEX "adhrs_employee_social_security_sscn_idx" ON "adhrs_employee_social_security"("sscn");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "adhrs_employee_org_assignment_employeeId_current_version_idx" ON "adhrs_employee_org_assignment"("employeeId", "current_version");

-- CreateIndex
CREATE INDEX "adhrs_employee_org_assignment_effectiveDate_idx" ON "adhrs_employee_org_assignment"("effectiveDate");

-- CreateIndex
CREATE UNIQUE INDEX "adhrs_employee_org_assignment_employeeId_effectiveDate_key" ON "adhrs_employee_org_assignment"("employeeId", "effectiveDate");

-- CreateIndex
CREATE INDEX "adhrs_employee_basic_info_employee_id_current_version_idx" ON "adhrs_employee_basic_info"("employee_id", "current_version");

-- CreateIndex
CREATE INDEX "adhrs_employee_basic_info_id_document_number_idx" ON "adhrs_employee_basic_info"("id_document_number");

