-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_adhrs_organization_versions" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "orgId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "orgType" TEXT,
    "departmentCategory" TEXT,
    "costCenterCode" TEXT,
    "departmentHeadId" INTEGER,
    "parentOrgId" INTEGER,
    "effectiveDate" DATETIME NOT NULL,
    "expirationDate" DATETIME,
    "current_version" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdBy" INTEGER,
    "updatedBy" INTEGER,
    "deletedAt" DATETIME,
    "tenantId" INTEGER,
    CONSTRAINT "adhrs_organization_versions_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "adhrs_organizations" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "adhrs_organization_versions_departmentHeadId_fkey" FOREIGN KEY ("departmentHeadId") REFERENCES "adhrs_employees" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "adhrs_organization_versions_parentOrgId_fkey" FOREIGN KEY ("parentOrgId") REFERENCES "adhrs_organizations" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_adhrs_organization_versions" ("createdAt", "createdBy", "current_version", "deletedAt", "effectiveDate", "expirationDate", "id", "name", "orgId", "orgType", "parentOrgId", "tenantId", "updatedAt", "updatedBy") SELECT "createdAt", "createdBy", "current_version", "deletedAt", "effectiveDate", "expirationDate", "id", "name", "orgId", "orgType", "parentOrgId", "tenantId", "updatedAt", "updatedBy" FROM "adhrs_organization_versions";
DROP TABLE "adhrs_organization_versions";
ALTER TABLE "new_adhrs_organization_versions" RENAME TO "adhrs_organization_versions";
CREATE INDEX "adhrs_organization_versions_orgId_current_version_idx" ON "adhrs_organization_versions"("orgId", "current_version");
CREATE INDEX "adhrs_organization_versions_effectiveDate_idx" ON "adhrs_organization_versions"("effectiveDate");
CREATE INDEX "adhrs_organization_versions_parentOrgId_idx" ON "adhrs_organization_versions"("parentOrgId");
CREATE INDEX "adhrs_organization_versions_departmentHeadId_idx" ON "adhrs_organization_versions"("departmentHeadId");
CREATE UNIQUE INDEX "adhrs_organization_versions_orgId_effectiveDate_key" ON "adhrs_organization_versions"("orgId", "effectiveDate");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
