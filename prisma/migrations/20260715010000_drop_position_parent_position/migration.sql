-- Remove the obsolete position self-hierarchy field. Position hierarchy is not used by the product UI.
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_adhrs_position_versions" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "positionId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "orgId" INTEGER,
    "job_level" TEXT,
    "effectiveDate" DATETIME NOT NULL,
    "expirationDate" DATETIME,
    "current_version" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdBy" INTEGER,
    "updatedBy" INTEGER,
    "deletedAt" DATETIME,
    "tenantId" INTEGER,
    CONSTRAINT "adhrs_position_versions_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "adhrs_positions" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "adhrs_position_versions_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "adhrs_organizations" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

INSERT INTO "new_adhrs_position_versions" (
    "id", "positionId", "name", "orgId", "job_level", "effectiveDate", "expirationDate",
    "current_version", "createdAt", "updatedAt", "createdBy", "updatedBy", "deletedAt", "tenantId"
)
SELECT
    "id", "positionId", "name", "orgId", "job_level", "effectiveDate", "expirationDate",
    "current_version", "createdAt", "updatedAt", "createdBy", "updatedBy", "deletedAt", "tenantId"
FROM "adhrs_position_versions";

DROP TABLE "adhrs_position_versions";
ALTER TABLE "new_adhrs_position_versions" RENAME TO "adhrs_position_versions";

CREATE INDEX "adhrs_position_versions_positionId_current_version_idx" ON "adhrs_position_versions"("positionId", "current_version");
CREATE INDEX "adhrs_position_versions_effectiveDate_idx" ON "adhrs_position_versions"("effectiveDate");
CREATE UNIQUE INDEX "adhrs_position_versions_positionId_effectiveDate_key" ON "adhrs_position_versions"("positionId", "effectiveDate");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
