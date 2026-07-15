// Version guards: effectiveDate-duplication checks and version timeline
// protections for org / position / employee effective-dated records.

import {
  DuplicateEffectiveDateError,
  LastVersionProtectionError,
  ValidationError,
} from "@/lib/errors";
import { prisma, type TxClient } from "@/lib/prisma";
import { toMidnightUtc } from "@/lib/datetime";

export type VersionedEntity = "organization" | "position" | "employee";

type VersionSummary = {
  id: number;
  effectiveDate: Date;
};

/** No two versions of an effective-dated employee infotype share an effective date. */
export async function checkNoDuplicateEffectiveDate(
  entity: "bank_account" | "social_security" | "person" | "compensation",
  employeeId: number,
  effectiveDate: Date | string,
  excludeId?: number,
  tx: TxClient = prisma,
): Promise<void> {
  const date = toMidnightUtc(effectiveDate);
  const notId = excludeId ? { NOT: { id: excludeId } } : {};
  let count = 0;
  if (entity === "person") {
    count = await tx.adhrs_employee_basic_info.count({
      where: { employee_id: employeeId, effectiveDate: date, deletedAt: null, ...notId },
    });
  } else if (entity === "compensation") {
    count = await tx.adhrs_employee_compensation.count({
      where: { employee_id: employeeId, effective_date: date, deletedAt: null, ...notId },
    });
  } else {
    count =
      entity === "bank_account"
        ? await tx.adhrs_employee_bank_account.count({
            where: { employee_id: employeeId, effective_date: date, deletedAt: null, ...notId },
          })
        : await tx.adhrs_employee_social_security.count({
            where: { employee_id: employeeId, effective_date: date, deletedAt: null, ...notId },
          });
  }
  if (count > 0) throw new DuplicateEffectiveDateError(entity.replace("_", " "));
}

/**
 * No two org/position/employee versions of the same master share an effective
 * date. Complements the `@@unique([masterId, effectiveDate])` DB constraint
 * so the error is surfaced as a typed DUPLICATE_EFFECTIVE_DATE before any write.
 */
export async function checkNoDuplicateVersionEffectiveDate(
  entity: VersionedEntity,
  masterId: number,
  effectiveDate: Date | string,
  excludeVersionId?: number,
  tx: TxClient = prisma,
): Promise<void> {
  const date = toMidnightUtc(effectiveDate);
  const notId = excludeVersionId ? { NOT: { id: excludeVersionId } } : {};
  let count = 0;
  if (entity === "organization") {
    count = await tx.adhrsOrganizationVersions.count({
      where: { orgId: masterId, effectiveDate: date, deletedAt: null, ...notId },
    });
  } else if (entity === "position") {
    count = await tx.adhrsPositionVersions.count({
      where: { positionId: masterId, effectiveDate: date, deletedAt: null, ...notId },
    });
  } else {
    count = await tx.adhrsEmployeeOrgAssignment.count({
      where: { employeeId: masterId, effectiveDate: date, deletedAt: null, ...notId },
    });
  }
  if (count > 0) throw new DuplicateEffectiveDateError(entity);
}

async function listVersions(
  entity: VersionedEntity,
  masterId: number,
  tx: TxClient = prisma,
): Promise<VersionSummary[]> {
  if (entity === "organization") {
    return tx.adhrsOrganizationVersions.findMany({
      where: { orgId: masterId, deletedAt: null },
      select: { id: true, effectiveDate: true },
      orderBy: [{ effectiveDate: "asc" }, { id: "asc" }],
    });
  }
  if (entity === "position") {
    return tx.adhrsPositionVersions.findMany({
      where: { positionId: masterId, deletedAt: null },
      select: { id: true, effectiveDate: true },
      orderBy: [{ effectiveDate: "asc" }, { id: "asc" }],
    });
  }
  return tx.adhrsEmployeeOrgAssignment.findMany({
    where: { employeeId: masterId, deletedAt: null },
    select: { id: true, effectiveDate: true },
    orderBy: [{ effectiveDate: "asc" }, { id: "asc" }],
  });
}

/** Block deletion when only one version remains for an org/position/employee. */
export async function checkNotLastVersion(
  entity: VersionedEntity,
  masterId: number,
  tx: TxClient = prisma,
): Promise<void> {
  const count = (await listVersions(entity, masterId, tx)).length;
  if (count <= 1) throw new LastVersionProtectionError(entity);
}

/** Block deletion of the earliest effective-dated version. */
export async function checkNotFirstVersion(
  entity: VersionedEntity,
  masterId: number,
  versionId: number,
  tx: TxClient = prisma,
): Promise<void> {
  const first = (await listVersions(entity, masterId, tx))[0];
  if (first?.id === versionId) {
    throw new ValidationError("第一个版本（生效日期最早）不允许被删除。");
  }
}

/** Block adding a subsequent version before the first historical version. */
export async function checkEffectiveDateNotBeforeFirstVersion(
  entity: VersionedEntity,
  masterId: number,
  effectiveDate: Date | string,
  tx: TxClient = prisma,
): Promise<void> {
  const first = (await listVersions(entity, masterId, tx))[0];
  if (!first) return;
  if (toMidnightUtc(effectiveDate).getTime() < first.effectiveDate.getTime()) {
    throw new ValidationError("生效日期不能早于第一个历史版本生效日期。");
  }
}

/** Validate moving an existing version to a new effective date. */
export async function checkVersionEffectiveDateMove(
  entity: VersionedEntity,
  masterId: number,
  versionId: number,
  effectiveDate: Date | string,
  tx: TxClient = prisma,
): Promise<void> {
  const targetDate = toMidnightUtc(effectiveDate);
  await checkNoDuplicateVersionEffectiveDate(entity, masterId, targetDate, versionId, tx);

  const versions = await listVersions(entity, masterId, tx);
  const currentIndex = versions.findIndex((version) => version.id === versionId);
  if (currentIndex === -1) {
    throw new ValidationError("要编辑的版本不存在或已被删除。");
  }

  const withoutCurrent = versions.filter((version) => version.id !== versionId);
  const previous = withoutCurrent
    .filter((version) => version.effectiveDate.getTime() < targetDate.getTime())
    .at(-1);
  const next = withoutCurrent.find(
    (version) => version.effectiveDate.getTime() > targetDate.getTime(),
  );

  if (previous && targetDate.getTime() <= previous.effectiveDate.getTime()) {
    throw new ValidationError("生效日期不能小于等于上个版本的生效日期。");
  }

  if (next && targetDate.getTime() >= next.effectiveDate.getTime()) {
    throw new ValidationError("生效日期不能大于或等于下个版本的生效日期。");
  }

  const first = versions[0];
  if (first && versionId !== first.id && targetDate.getTime() < first.effectiveDate.getTime()) {
    throw new ValidationError("生效日期不能早于第一个历史版本生效日期。");
  }
}
