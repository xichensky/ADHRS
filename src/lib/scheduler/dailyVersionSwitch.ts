// Schedule: Daily Update Current Version — at the UTC day boundary (and on
// demand via System State → Run now), recompute the current version for every
// effective-dated infotype. Self-healing: it considers EVERY record effective
// on or before `now` (not just today's), so a missed run is recovered by the
// next run. Idempotent — recomputing an infotype whose flags are already
// correct is a no-op.

import { prisma } from "@/lib/prisma";
import {
  updateOrgAssignmentAsCurrent,
  updateOrgAsCurrentVersion,
  updatePositionAsCurrentVersion,
  setSocialSecurityCurrentVersion,
  setBankAccountCurrentVersion,
  setBasicInfoCurrentVersion,
  setCompensationCurrentVersion,
} from "@/lib/versioning";

export interface SwitchResult {
  day: string;
  organization: number;
  position: number;
  employee: number;
  person: number;
  compensation: number;
  socialSecurity: number;
  bankAccount: number;
}

export async function runDailyVersionSwitch(now: Date = new Date()): Promise<SwitchResult> {
  // Every infotype with at least one record effective on/before now is a
  // candidate; the per-infotype recompute picks the correct current version.
  const [orgIds, posIds, empIds, personEmpIds, compEmpIds, sscEmpIds, bankEmpIds] = await Promise.all([
    prisma.adhrsOrganizationVersions.findMany({
      where: { effectiveDate: { lte: now }, deletedAt: null },
      distinct: ["orgId"],
      select: { orgId: true },
    }),
    prisma.adhrsPositionVersions.findMany({
      where: { effectiveDate: { lte: now }, deletedAt: null },
      distinct: ["positionId"],
      select: { positionId: true },
    }),
    prisma.adhrsEmployeeOrgAssignment.findMany({
      where: { effectiveDate: { lte: now }, deletedAt: null },
      distinct: ["employeeId"],
      select: { employeeId: true },
    }),
    prisma.adhrs_employee_basic_info.findMany({
      where: { effectiveDate: { lte: now }, deletedAt: null },
      distinct: ["employee_id"],
      select: { employee_id: true },
    }),
    prisma.adhrs_employee_compensation.findMany({
      where: { effective_date: { lte: now }, deletedAt: null },
      distinct: ["employee_id"],
      select: { employee_id: true },
    }),
    prisma.adhrs_employee_social_security.findMany({
      where: { effective_date: { lte: now }, deletedAt: null },
      distinct: ["employee_id"],
      select: { employee_id: true },
    }),
    prisma.adhrs_employee_bank_account.findMany({
      where: { effective_date: { lte: now }, deletedAt: null },
      distinct: ["employee_id"],
      select: { employee_id: true },
    }),
  ]);

  const safe = <T>(p: Promise<T>) =>
    p.then(
      () => true,
      (e) => {
        // eslint-disable-next-line no-console
        console.error("[scheduler] branch failed:", e);
        return false;
      },
    );

  // Run each infotype group sequentially (parallel within a group). SQLite dev
  // is single-writer — one big Promise.all across all groups starves the writer
  // (P1008 timeouts). Sequential-by-group cuts peak concurrency to the largest
  // single infotype and is gentler on MySQL too.
  await Promise.all(orgIds.map((r) => safe(updateOrgAsCurrentVersion(r.orgId))));
  await Promise.all(posIds.map((r) => safe(updatePositionAsCurrentVersion(r.positionId))));
  await Promise.all(empIds.map((r) => safe(updateOrgAssignmentAsCurrent(r.employeeId))));
  await Promise.all(personEmpIds.map((r) => safe(setBasicInfoCurrentVersion(r.employee_id))));
  await Promise.all(compEmpIds.map((r) => safe(setCompensationCurrentVersion(r.employee_id))));
  await Promise.all(sscEmpIds.map((r) => safe(setSocialSecurityCurrentVersion(r.employee_id))));
  await Promise.all(bankEmpIds.map((r) => safe(setBankAccountCurrentVersion(r.employee_id))));

  return {
    day: now.toISOString().slice(0, 10),
    organization: orgIds.length,
    position: posIds.length,
    employee: empIds.length,
    person: personEmpIds.length,
    compensation: compEmpIds.length,
    socialSecurity: sscEmpIds.length,
    bankAccount: bankEmpIds.length,
  };
}
