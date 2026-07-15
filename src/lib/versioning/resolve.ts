// Read-time historical resolution for the time-axis model.
//
// Relationships in version tables point to MASTER ids (e.g. an employee
// version's orgId -> adhrs_organizations). To answer "which version of X was
// effective on date D" — for point-in-time reconstruction of the org chart /
// reporting lines / assignments — resolve AT READ TIME via pickByEffectiveDate
// with D as the reference.
//
// This is the SAP HCM (relationship infotype) / 用友 / 金蝶 style of
// effective-date-range resolution. It deliberately does NOT freeze a version
// pointer at write time, so retroactive/backdated corrections to a parent
// entity's history flow through automatically (no stale pointers).

import { prisma, type TxClient } from "@/lib/prisma";
import { pickByEffectiveDate } from "./_shared";

/** The org version that was effective (and not expired) on `date`, or null. */
export async function resolveOrgVersionAt(
  orgMasterId: number,
  date: Date,
  tx: TxClient = prisma,
) {
  const versions = await tx.adhrsOrganizationVersions.findMany({
    where: { orgId: orgMasterId, deletedAt: null },
    orderBy: [{ effectiveDate: "asc" }, { id: "asc" }],
  });
  return pickByEffectiveDate(versions, (v) => v.effectiveDate, (v) => v.expirationDate, date);
}

/** The position version that was effective on `date`, or null. */
export async function resolvePositionVersionAt(
  positionMasterId: number,
  date: Date,
  tx: TxClient = prisma,
) {
  const versions = await tx.adhrsPositionVersions.findMany({
    where: { positionId: positionMasterId, deletedAt: null },
    orderBy: [{ effectiveDate: "asc" }, { id: "asc" }],
  });
  return pickByEffectiveDate(versions, (v) => v.effectiveDate, (v) => v.expirationDate, date);
}

/** The employee version that was effective on `date`, or null. */
export async function resolveOrgAssignmentAt(
  employeeMasterId: number,
  date: Date,
  tx: TxClient = prisma,
) {
  const versions = await tx.adhrsEmployeeOrgAssignment.findMany({
    where: { employeeId: employeeMasterId, deletedAt: null },
    orderBy: [{ effectiveDate: "asc" }, { id: "asc" }],
  });
  return pickByEffectiveDate(versions, (v) => v.effectiveDate, (v) => v.expirationDate, date);
}

/** The person (personal-data infotype) version effective on `date`, or null. */
export async function resolveBasicInfoAt(
  employeeId: number,
  date: Date,
  tx: TxClient = prisma,
) {
  const items = await tx.adhrs_employee_basic_info.findMany({
    where: { employee_id: employeeId, deletedAt: null },
    orderBy: [{ effectiveDate: "asc" }, { id: "asc" }],
  });
  return pickByEffectiveDate(items, (i) => i.effectiveDate, (i) => i.expirationDate, date);
}

/** The compensation infotype version effective on `date`, or null. */
export async function resolveCompensationAt(
  employeeId: number,
  date: Date,
  tx: TxClient = prisma,
) {
  const items = await tx.adhrs_employee_compensation.findMany({
    where: { employee_id: employeeId, deletedAt: null },
    orderBy: [{ effective_date: "asc" }, { id: "asc" }],
  });
  return pickByEffectiveDate(items, (i) => i.effective_date, (i) => i.expiration_date, date);
}

/** The id of the version of `kind`'s master effective on `date`, or null. */
export async function resolveVersionAt(
  kind: "org" | "position" | "employee",
  masterId: number,
  date: Date,
  tx: TxClient = prisma,
): Promise<number | null> {
  const v =
    kind === "org"
      ? await resolveOrgVersionAt(masterId, date, tx)
      : kind === "position"
        ? await resolvePositionVersionAt(masterId, date, tx)
        : await resolveOrgAssignmentAt(masterId, date, tx);
  return v?.id ?? null;
}

/**
 * Reconstruct the organization tree as it stood on `date`: every org that had a
 * live version on `date`, with its name/type and the master id of its parent at
 * that time (parentOrgId points to a master; match it against other nodes'
 * orgId to build edges). Orgs with no version effective on `date` are omitted.
 */
export async function buildOrgTreeAtDate(date: Date, tx: TxClient = prisma) {
  const orgs = await tx.adhrsOrganizations.findMany({ where: { deletedAt: null } });
  const nodes = await Promise.all(
    orgs.map(async (o) => {
      const v = await resolveOrgVersionAt(o.id, date, tx);
      if (!v) return null;
      return {
        orgId: o.id,
        code: o.code,
        versionId: v.id,
        name: v.orgName,
        orgType: v.orgType,
        parentOrgId: v.parentOrgId,
        effectiveDate: v.effectiveDate,
        expirationDate: v.expirationDate,
      };
    }),
  );
  return nodes.filter((n): n is NonNullable<typeof n> => n !== null);
}
