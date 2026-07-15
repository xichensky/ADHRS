// Position triggers — mirror of orgTriggers. Position code uses the job-level
// letter as prefix (e.g. L0001). Every multi-step mutation runs in one tx.

import { NotFoundError, ValidationError } from "@/lib/errors";
import { prisma, type TxClient } from "@/lib/prisma";
import { toMidnightUtc, previousUtcDay } from "@/lib/datetime";
import { generatePositionCode } from "@/lib/codegen";
import { updatePositionAsCurrentVersion, withTx } from "@/lib/versioning";
import {
  checkEffectiveDateNotBeforeFirstVersion,
  checkNoDuplicateVersionEffectiveDate,
  checkNotFirstVersion,
  checkNotLastVersion,
  checkVersionEffectiveDateMove,
} from "@/lib/prechecks";
import { validateEnum } from "@/lib/validation";
import { JOB_LEVELS } from "@/lib/types";

export interface PositionVersionInput {
  name: string;
  orgId?: number;
  jobLevel?: string;
  effectiveDate: Date | string;
  /** system-managed; accepted for backward compatibility but ignored */
  expirationDate?: Date | string;
}

function versionData(i: PositionVersionInput) {
  return {
    positionName: i.name,
    orgId: i.orgId ?? null,
    job_level: i.jobLevel ?? null,
    effectiveDate: toMidnightUtc(i.effectiveDate),
    expirationDate: null,
    current_version: false,
  };
}

async function checkOrgIsActiveAt(
  orgId: number | null | undefined,
  effectiveDate: Date | string,
  tx: TxClient,
): Promise<void> {
  if (!orgId) return;
  const date = toMidnightUtc(effectiveDate);
  const org = await tx.adhrsOrganizations.findFirst({
    where: {
      id: orgId,
      deletedAt: null,
      versions: {
        some: {
          deletedAt: null,
          effectiveDate: { lte: date },
          OR: [{ expirationDate: null }, { expirationDate: { gte: date } }],
        },
      },
    },
    select: { id: true },
  });
  if (!org) throw new ValidationError("所属组织必须在该生效日期当天有效。");
}

async function normalizePositionVersionRanges(positionId: number, tx: TxClient): Promise<void> {
  const versions = await tx.adhrsPositionVersions.findMany({
    where: { positionId, deletedAt: null },
    orderBy: [{ effectiveDate: "asc" }, { id: "asc" }],
  });

  for (let i = 0; i < versions.length; i += 1) {
    const next = versions[i + 1];
    await tx.adhrsPositionVersions.update({
      where: { id: versions[i].id },
      data: {
        expirationDate: next
          ? previousUtcDay(next.effectiveDate)
          : toMidnightUtc("9999-12-31"),
      },
    });
  }
}

/** Trigger: Create Position Version (initial). */
export async function createPosition(
  input: PositionVersionInput,
): Promise<{ positionId: number; versionId: number; code: string }> {
  validateEnum("Job level", input.jobLevel, JOB_LEVELS);
  return prisma.$transaction(async (tx) => {
    await checkOrgIsActiveAt(input.orgId, input.effectiveDate, tx);
    const code = await generatePositionCode(input.jobLevel ?? "P", tx);
    const pos = await tx.adhrsPositions.create({
      data: {
        code,
        positionName: input.name,
        status: true,
        versions: { create: versionData(input) },
      },
      include: { versions: true },
    });
    await normalizePositionVersionRanges(pos.id, tx);
    await updatePositionAsCurrentVersion(pos.id, tx);
    return { positionId: pos.id, versionId: pos.versions[0].id, code };
  });
}

/** Trigger: Create Position Version (subsequent). */
export async function addPositionVersion(
  positionId: number,
  input: PositionVersionInput,
): Promise<{ versionId: number }> {
  validateEnum("Job level", input.jobLevel, JOB_LEVELS);
  return prisma.$transaction(async (tx) => {
    await checkNoDuplicateVersionEffectiveDate("position", positionId, input.effectiveDate, undefined, tx);
    await checkEffectiveDateNotBeforeFirstVersion("position", positionId, input.effectiveDate, tx);
    await checkOrgIsActiveAt(input.orgId, input.effectiveDate, tx);
    const effectiveDate = toMidnightUtc(input.effectiveDate);
    const deletedVersion = await tx.adhrsPositionVersions.findFirst({
      where: { positionId, effectiveDate, deletedAt: { not: null } },
      select: { id: true },
    });
    const data = { positionId, ...versionData(input) };
    const v = deletedVersion
      ? await tx.adhrsPositionVersions.update({
          where: { id: deletedVersion.id },
          data: { ...data, deletedAt: null },
        })
      : await tx.adhrsPositionVersions.create({ data });
    await normalizePositionVersionRanges(positionId, tx);
    await updatePositionAsCurrentVersion(positionId, tx);
    return { versionId: v.id };
  });
}

/** Trigger: Edit Position Version — re-sync current denormalized fields. */
export async function editPositionVersion(
  versionId: number,
  patch: Partial<PositionVersionInput>,
): Promise<void> {
  validateEnum("Job level", patch.jobLevel, JOB_LEVELS);
  return prisma.$transaction(async (tx) => {
    const v = await tx.adhrsPositionVersions.findUnique({ where: { id: versionId } });
    if (!v) throw new NotFoundError("Position Version", versionId);
    if (patch.effectiveDate) {
      await checkVersionEffectiveDateMove("position", v.positionId, versionId, patch.effectiveDate, tx);
    }
    if (patch.orgId !== undefined || patch.effectiveDate) {
      await checkOrgIsActiveAt(
        patch.orgId !== undefined ? patch.orgId : v.orgId ?? undefined,
        patch.effectiveDate ?? v.effectiveDate,
        tx,
      );
    }
    await tx.adhrsPositionVersions.update({
      where: { id: versionId },
      data: {
        ...(patch.name !== undefined ? { positionName: patch.name } : {}),
        ...(patch.orgId !== undefined ? { orgId: patch.orgId } : {}),
        ...(patch.jobLevel !== undefined ? { job_level: patch.jobLevel } : {}),
        ...(patch.effectiveDate ? { effectiveDate: toMidnightUtc(patch.effectiveDate) } : {}),
      },
    });
    await normalizePositionVersionRanges(v.positionId, tx);
    await updatePositionAsCurrentVersion(v.positionId, tx);
  });
}

/** Delete: Position Version — soft-delete non-initial version, repair ranges, recompute current. */
export async function deletePositionVersion(
  versionId: number,
  tx?: TxClient,
): Promise<{ positionId: number }> {
  return withTx(tx, async (t) => {
    const v = await t.adhrsPositionVersions.findUnique({ where: { id: versionId } });
    if (!v) throw new NotFoundError("Position Version", versionId);
    await checkNotLastVersion("position", v.positionId, t);
    await checkNotFirstVersion("position", v.positionId, versionId, t);
    await t.adhrsPositionVersions.update({
      where: { id: versionId },
      data: { deletedAt: new Date(), current_version: false },
    });
    await normalizePositionVersionRanges(v.positionId, t);
    await updatePositionAsCurrentVersion(v.positionId, t);
    return { positionId: v.positionId };
  });
}

/**
 * Delete: Position master + all versions only when the position is unbound.
 * Mirrors `deleteOrganization`: a position referenced by any active (non-deleted)
 * employee org assignment — via primary `positionId` or `secondaryPositionId` —
 * cannot be removed. Positions have no subtree, so no descendant collection.
 */
export async function deletePosition(positionId: number): Promise<void> {
  return prisma.$transaction(async (tx) => {
    const position = await tx.adhrsPositions.findFirst({
      where: { id: positionId, deletedAt: null },
      select: { id: true },
    });
    if (!position) throw new NotFoundError("Position", positionId);

    const assignmentCount = await tx.adhrsEmployeeOrgAssignment.count({
      where: {
        OR: [{ positionId }, { secondaryPositionId: positionId }],
        deletedAt: null,
      },
    });
    if (assignmentCount > 0) {
      throw new ValidationError("该职位存在历史、当前或未来绑定的人员记录，不允许删除。");
    }

    const now = new Date();
    await tx.adhrsPositionVersions.updateMany({
      where: { positionId, deletedAt: null },
      data: { deletedAt: now, current_version: false },
    });
    await tx.adhrsPositions.updateMany({
      where: { id: positionId, deletedAt: null },
      data: { deletedAt: now, status: false },
    });
  });
}
