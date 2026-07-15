-- CreateTable
CREATE TABLE "country" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "country_code" TEXT NOT NULL,
    "country_name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdBy" INTEGER,
    "updatedBy" INTEGER,
    "deletedAt" DATETIME
);

-- CreateTable
CREATE TABLE "bank" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "bank_code" TEXT NOT NULL,
    "bank_name" TEXT NOT NULL,
    "bank_name_short" TEXT,
    "country_id" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdBy" INTEGER,
    "updatedBy" INTEGER,
    "deletedAt" DATETIME,
    CONSTRAINT "bank_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "country" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "currency" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "currency_code" TEXT NOT NULL,
    "currency_name" TEXT NOT NULL,
    "symbol" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdBy" INTEGER,
    "updatedBy" INTEGER,
    "deletedAt" DATETIME
);

-- CreateTable
CREATE TABLE "id_document_type" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "document_type_name" TEXT NOT NULL,
    "country_id" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdBy" INTEGER,
    "updatedBy" INTEGER,
    "deletedAt" DATETIME,
    CONSTRAINT "id_document_type_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "country" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "legal_entity_register_number_type" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "country_id" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdBy" INTEGER,
    "updatedBy" INTEGER,
    "deletedAt" DATETIME,
    CONSTRAINT "legal_entity_register_number_type_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "country" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "location" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "country_id" INTEGER,
    "parentId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdBy" INTEGER,
    "updatedBy" INTEGER,
    "deletedAt" DATETIME,
    CONSTRAINT "location_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "country" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "location_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "location" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "adhrs_hrs_contract_type" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdBy" INTEGER,
    "updatedBy" INTEGER,
    "deletedAt" DATETIME
);

-- CreateTable
CREATE TABLE "adhrs_employees" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" BOOLEAN NOT NULL DEFAULT true,
    "hireDate" DATETIME NOT NULL,
    "employmentEndDate" DATETIME,
    "userId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdBy" INTEGER,
    "updatedBy" INTEGER
);

-- CreateTable
CREATE TABLE "adhrs_organizations" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" BOOLEAN NOT NULL DEFAULT true,
    "structureType" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdBy" INTEGER,
    "updatedBy" INTEGER
);

-- CreateTable
CREATE TABLE "adhrs_positions" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdBy" INTEGER,
    "updatedBy" INTEGER
);

-- CreateTable
CREATE TABLE "adhrs_legal_entity" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "entity_name" TEXT NOT NULL,
    "register_number" TEXT NOT NULL,
    "register_number_type_id" INTEGER,
    "country_id" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdBy" INTEGER,
    "updatedBy" INTEGER,
    "deletedAt" DATETIME,
    CONSTRAINT "adhrs_legal_entity_register_number_type_id_fkey" FOREIGN KEY ("register_number_type_id") REFERENCES "legal_entity_register_number_type" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "adhrs_legal_entity_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "country" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "adhrs_system_state" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "state_key" TEXT NOT NULL,
    "state_value" JSONB NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdBy" INTEGER,
    "updatedBy" INTEGER,
    "deletedAt" DATETIME
);

-- CreateTable
CREATE TABLE "adhrs_contract" (
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
    CONSTRAINT "adhrs_contract_contract_type_id_fkey" FOREIGN KEY ("contract_type_id") REFERENCES "adhrs_hrs_contract_type" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "adhrs_contract_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "adhrs_employees" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "adhrs_contract_employee_version_id_fkey" FOREIGN KEY ("employee_version_id") REFERENCES "adhrs_employee_versions" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "adhrs_employee_versions" (
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
    CONSTRAINT "adhrs_employee_versions_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "adhrs_employees" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "adhrs_employee_versions_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "adhrs_organizations" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "adhrs_employee_versions_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "adhrs_positions" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "adhrs_employee_versions_secondaryPositionId_fkey" FOREIGN KEY ("secondaryPositionId") REFERENCES "adhrs_positions" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "adhrs_employee_versions_reportToEmployeeId_fkey" FOREIGN KEY ("reportToEmployeeId") REFERENCES "adhrs_employees" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "adhrs_employee_versions_operationalLeaderEmployeeId_fkey" FOREIGN KEY ("operationalLeaderEmployeeId") REFERENCES "adhrs_employees" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "adhrs_employee_versions_functionalLeaderEmployeeId_fkey" FOREIGN KEY ("functionalLeaderEmployeeId") REFERENCES "adhrs_employees" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "adhrs_organization_versions" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "orgId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "orgType" TEXT,
    "parentOrgId" INTEGER,
    "currentOrg_id" INTEGER,
    "effectiveDate" DATETIME NOT NULL,
    "expirationDate" DATETIME,
    "current_version" BOOLEAN NOT NULL DEFAULT false,
    "versionDiff" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdBy" INTEGER,
    "updatedBy" INTEGER,
    CONSTRAINT "adhrs_organization_versions_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "adhrs_organizations" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "adhrs_organization_versions_parentOrgId_fkey" FOREIGN KEY ("parentOrgId") REFERENCES "adhrs_organizations" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "adhrs_organization_versions_currentOrg_id_fkey" FOREIGN KEY ("currentOrg_id") REFERENCES "adhrs_organizations" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "adhrs_position_versions" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "positionId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "orgId" INTEGER,
    "parentPositionId" INTEGER,
    "job_level" TEXT,
    "effectiveDate" DATETIME NOT NULL,
    "expirationDate" DATETIME,
    "current_version" BOOLEAN NOT NULL DEFAULT false,
    "versionDiff" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdBy" INTEGER,
    "updatedBy" INTEGER,
    CONSTRAINT "adhrs_position_versions_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "adhrs_positions" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "adhrs_position_versions_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "adhrs_organizations" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "adhrs_position_versions_parentPositionId_fkey" FOREIGN KEY ("parentPositionId") REFERENCES "adhrs_positions" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "adhrs_employee_person" (
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
    "emergency_contact_name" TEXT,
    "emergency_contact_phone" TEXT,
    "emergency_contact_relationship" TEXT,
    "current_version" BOOLEAN NOT NULL DEFAULT false,
    "effectiveDate" DATETIME,
    "deletedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdBy" INTEGER,
    "updatedBy" INTEGER,
    CONSTRAINT "adhrs_employee_person_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "adhrs_employees" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "adhrs_employee_person_employee_version_id_fkey" FOREIGN KEY ("employee_version_id") REFERENCES "adhrs_employee_versions" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "adhrs_employee_person_id_document_type_id_fkey" FOREIGN KEY ("id_document_type_id") REFERENCES "id_document_type" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "adhrs_employee_person_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "country" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "adhrs_employee_bank_account" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "employee_id" INTEGER NOT NULL,
    "employee_version_id" INTEGER,
    "account_holder_name" TEXT NOT NULL,
    "bank_id" INTEGER,
    "currency_id" INTEGER,
    "country_id" INTEGER,
    "effective_date" DATETIME NOT NULL,
    "current_version" BOOLEAN NOT NULL DEFAULT false,
    "attachment" JSONB,
    "deletedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdBy" INTEGER,
    "updatedBy" INTEGER,
    CONSTRAINT "adhrs_employee_bank_account_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "adhrs_employees" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "adhrs_employee_bank_account_employee_version_id_fkey" FOREIGN KEY ("employee_version_id") REFERENCES "adhrs_employee_versions" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "adhrs_employee_bank_account_bank_id_fkey" FOREIGN KEY ("bank_id") REFERENCES "bank" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "adhrs_employee_bank_account_currency_id_fkey" FOREIGN KEY ("currency_id") REFERENCES "currency" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "adhrs_employee_bank_account_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "country" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "adhrs_employee_social_security" (
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
    "current_version" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdBy" INTEGER,
    "updatedBy" INTEGER,
    CONSTRAINT "adhrs_employee_social_security_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "adhrs_employees" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "adhrs_employee_social_security_employee_version_id_fkey" FOREIGN KEY ("employee_version_id") REFERENCES "adhrs_employee_versions" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "adhrs_employee_education_background" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "employee_id" INTEGER NOT NULL,
    "employee_version_id" INTEGER,
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
    CONSTRAINT "adhrs_employee_education_background_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "adhrs_employees" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "adhrs_employee_education_background_employee_version_id_fkey" FOREIGN KEY ("employee_version_id") REFERENCES "adhrs_employee_versions" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "adhrs_employee_work_experience" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "employee_id" INTEGER NOT NULL,
    "employee_version_id" INTEGER,
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
    CONSTRAINT "adhrs_employee_work_experience_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "adhrs_employees" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "adhrs_employee_work_experience_employee_version_id_fkey" FOREIGN KEY ("employee_version_id") REFERENCES "adhrs_employee_versions" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "adhrs_employee_change_record" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "employee_version_id" INTEGER NOT NULL,
    "employee_id" INTEGER,
    "change_type" TEXT,
    "deletedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdBy" INTEGER,
    "updatedBy" INTEGER,
    CONSTRAINT "adhrs_employee_change_record_employee_version_id_fkey" FOREIGN KEY ("employee_version_id") REFERENCES "adhrs_employee_versions" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "adhrs_employee_change_record_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "adhrs_employees" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "adhrs_employee_version_payment_final_approver_relation" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "employee_version_id" INTEGER NOT NULL,
    "approver_employee_id" INTEGER NOT NULL,
    "deletedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdBy" INTEGER,
    "updatedBy" INTEGER,
    CONSTRAINT "adhrs_employee_version_payment_final_approver_relation_employee_version_id_fkey" FOREIGN KEY ("employee_version_id") REFERENCES "adhrs_employee_versions" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "adhrs_employee_version_payment_final_approver_relation_approver_employee_id_fkey" FOREIGN KEY ("approver_employee_id") REFERENCES "adhrs_employees" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "adhrs_legal_entity_contract_relation" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "legal_entity_id" INTEGER NOT NULL,
    "contract_id" INTEGER NOT NULL,
    "deletedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdBy" INTEGER,
    "updatedBy" INTEGER,
    CONSTRAINT "adhrs_legal_entity_contract_relation_legal_entity_id_fkey" FOREIGN KEY ("legal_entity_id") REFERENCES "adhrs_legal_entity" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "adhrs_legal_entity_contract_relation_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "adhrs_contract" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "adhrs_employee_contract_person_relation" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "employee_id" INTEGER NOT NULL,
    "employee_version_id" INTEGER,
    "contract_person_uuid" TEXT NOT NULL,
    "deletedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdBy" INTEGER,
    "updatedBy" INTEGER,
    CONSTRAINT "adhrs_employee_contract_person_relation_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "adhrs_employees" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "adhrs_employee_contract_person_relation_employee_version_id_fkey" FOREIGN KEY ("employee_version_id") REFERENCES "adhrs_employee_versions" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "adhrs_hrs_cms_contract_type_realtion" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "contract_type_id" INTEGER NOT NULL,
    "cms_contract_type_uuid" TEXT NOT NULL,
    "deletedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdBy" INTEGER,
    "updatedBy" INTEGER,
    CONSTRAINT "adhrs_hrs_cms_contract_type_realtion_contract_type_id_fkey" FOREIGN KEY ("contract_type_id") REFERENCES "adhrs_hrs_contract_type" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "adhrs_hrs_cms_legal_entity_realtion" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "legal_entity_id" INTEGER NOT NULL,
    "cms_legal_entity_uuid" TEXT NOT NULL,
    "deletedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdBy" INTEGER,
    "updatedBy" INTEGER,
    CONSTRAINT "adhrs_hrs_cms_legal_entity_realtion_legal_entity_id_fkey" FOREIGN KEY ("legal_entity_id") REFERENCES "adhrs_legal_entity" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "adhrs_contract_seq" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "contract_type_id" INTEGER NOT NULL,
    "seq_date" DATETIME NOT NULL,
    "current_seq" INTEGER NOT NULL DEFAULT 0,
    "deletedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdBy" INTEGER,
    "updatedBy" INTEGER,
    CONSTRAINT "adhrs_contract_seq_contract_type_id_fkey" FOREIGN KEY ("contract_type_id") REFERENCES "adhrs_hrs_contract_type" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "country_country_code_key" ON "country"("country_code");

-- CreateIndex
CREATE UNIQUE INDEX "bank_bank_code_key" ON "bank"("bank_code");

-- CreateIndex
CREATE UNIQUE INDEX "currency_currency_code_key" ON "currency"("currency_code");

-- CreateIndex
CREATE UNIQUE INDEX "legal_entity_register_number_type_code_key" ON "legal_entity_register_number_type"("code");

-- CreateIndex
CREATE UNIQUE INDEX "location_code_key" ON "location"("code");

-- CreateIndex
CREATE UNIQUE INDEX "adhrs_hrs_contract_type_code_key" ON "adhrs_hrs_contract_type"("code");

-- CreateIndex
CREATE INDEX "adhrs_employees_name_idx" ON "adhrs_employees"("name");

-- CreateIndex
CREATE UNIQUE INDEX "adhrs_employees_code_key" ON "adhrs_employees"("code");

-- CreateIndex
CREATE INDEX "adhrs_organizations_name_idx" ON "adhrs_organizations"("name");

-- CreateIndex
CREATE UNIQUE INDEX "adhrs_organizations_code_key" ON "adhrs_organizations"("code");

-- CreateIndex
CREATE INDEX "adhrs_positions_name_idx" ON "adhrs_positions"("name");

-- CreateIndex
CREATE UNIQUE INDEX "adhrs_positions_code_key" ON "adhrs_positions"("code");

-- CreateIndex
CREATE UNIQUE INDEX "adhrs_legal_entity_register_number_key" ON "adhrs_legal_entity"("register_number");

-- CreateIndex
CREATE UNIQUE INDEX "adhrs_system_state_state_key_key" ON "adhrs_system_state"("state_key");

-- CreateIndex
CREATE UNIQUE INDEX "adhrs_contract_conctract_no_key" ON "adhrs_contract"("conctract_no");

-- CreateIndex
CREATE INDEX "adhrs_employee_versions_employeeId_current_version_idx" ON "adhrs_employee_versions"("employeeId", "current_version");

-- CreateIndex
CREATE INDEX "adhrs_employee_versions_effectiveDate_idx" ON "adhrs_employee_versions"("effectiveDate");

-- CreateIndex
CREATE INDEX "adhrs_organization_versions_orgId_current_version_idx" ON "adhrs_organization_versions"("orgId", "current_version");

-- CreateIndex
CREATE INDEX "adhrs_organization_versions_effectiveDate_idx" ON "adhrs_organization_versions"("effectiveDate");

-- CreateIndex
CREATE INDEX "adhrs_position_versions_positionId_current_version_idx" ON "adhrs_position_versions"("positionId", "current_version");

-- CreateIndex
CREATE INDEX "adhrs_position_versions_effectiveDate_idx" ON "adhrs_position_versions"("effectiveDate");

-- CreateIndex
CREATE INDEX "adhrs_employee_person_employee_id_current_version_idx" ON "adhrs_employee_person"("employee_id", "current_version");

-- CreateIndex
CREATE INDEX "adhrs_employee_bank_account_employee_id_current_version_idx" ON "adhrs_employee_bank_account"("employee_id", "current_version");

-- CreateIndex
CREATE INDEX "adhrs_employee_social_security_employee_id_current_version_idx" ON "adhrs_employee_social_security"("employee_id", "current_version");

-- CreateIndex
CREATE UNIQUE INDEX "adhrs_employee_version_payment_final_approver_relation_employee_version_id_approver_employee_id_key" ON "adhrs_employee_version_payment_final_approver_relation"("employee_version_id", "approver_employee_id");

-- CreateIndex
CREATE UNIQUE INDEX "adhrs_legal_entity_contract_relation_legal_entity_id_contract_id_key" ON "adhrs_legal_entity_contract_relation"("legal_entity_id", "contract_id");

-- CreateIndex
CREATE UNIQUE INDEX "adhrs_employee_contract_person_relation_contract_person_uuid_key" ON "adhrs_employee_contract_person_relation"("contract_person_uuid");

-- CreateIndex
CREATE UNIQUE INDEX "adhrs_hrs_cms_contract_type_realtion_cms_contract_type_uuid_key" ON "adhrs_hrs_cms_contract_type_realtion"("cms_contract_type_uuid");

-- CreateIndex
CREATE UNIQUE INDEX "adhrs_hrs_cms_legal_entity_realtion_cms_legal_entity_uuid_key" ON "adhrs_hrs_cms_legal_entity_realtion"("cms_legal_entity_uuid");

-- CreateIndex
CREATE UNIQUE INDEX "adhrs_contract_seq_contract_type_id_seq_date_key" ON "adhrs_contract_seq"("contract_type_id", "seq_date");
