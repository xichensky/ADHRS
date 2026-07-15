// Organization triggers — orchestrators mirroring the report's global triggers:
//   Trigger: Create Organization Version  (create master + first version + code + current)
//   Trigger: Edit Organization Version     (re-sync current)
//   Delete:   Organization Version         (version guards + recompute current)
//
// Deviation (documented): org codes are generated once at master creation and
// are permanent; the report regenerates on each version, which is not correct
// HR behavior. Every multi-step mutation runs in a single transaction.

import { NotFoundError, ValidationError } from "@/lib/errors";
import { prisma, type TxClient } from "@/lib/prisma";
import { toMidnightUtc, previousUtcDay } from "@/lib/datetime";
import { generateOrganizationCode } from "@/lib/codegen";
import { updateOrgAsCurrentVersion, withTx } from "@/lib/versioning";
import {
  checkEffectiveDateNotBeforeFirstVersion,
  checkNoDuplicateVersionEffectiveDate,
  checkNoHierarchyCycle,
  checkNotFirstVersion,
  checkNotLastVersion,
  checkVersionEffectiveDateMove,
} from "@/lib/prechecks";
import { validateEnum } from "@/lib/validation";
import { ORG_TYPES, STRUCTURE_TYPES } from "@/lib/types";

export interface OrgVersionInput {
  name: string;
  orgType?: string;
  costCenterCode?: string;
  departmentHeadId?: number;
  parentOrgId?: number;
  effectiveDate: Date | string;
  /** system-managed; accepted for backward compatibility but ignored */
  expirationDate?: Date | string;
  /** only at creation */
  structureType?: string;
  /** code prefix (e.g. city/location code); defaults to "ORG" */
  prefix?: string;
}

function versionData(i: OrgVersionInput) {
  return {
    orgName: i.name,
    orgType: i.orgType ?? null,
    costCenterCode: i.costCenterCode ?? null,
    departmentHeadId: i.departmentHeadId ?? null,
    parentOrgId: i.parentOrgId ?? null,
    effectiveDate: toMidnightUtc(i.effectiveDate),
    expirationDate: null,
    current_version: false,
  };
}

async function checkParentOrgEffectiveAt(
  parentOrgId: number | null | undefined,
  childEffectiveDate: Date | string,
  tx: TxClient,
): Promise<void> {
  if (!parentOrgId) return;

  const effectiveAt = toMidnightUtc(childEffectiveDate);
  const parent = await tx.adhrsOrganizations.findFirst({
    where: {
      id: parentOrgId,
      deletedAt: null,
      versions: {
        some: {
          deletedAt: null,
          effectiveDate: { lte: effectiveAt },
          OR: [{ expirationDate: null }, { expirationDate: { gte: effectiveAt } }],
        },
      },
    },
    select: { id: true },
  });

  if (!parent) {
    throw new ValidationError("上级组织必须在新组织的生效日期当天有效。");
  }
}

async function checkDepartmentHeadExists(
  departmentHeadId: number | null | undefined,
  tx: TxClient,
): Promise<void> {
  if (!departmentHeadId) return;
  const employee = await tx.adhrsEmployees.findFirst({
    where: { id: departmentHeadId, deletedAt: null },
    select: { id: true },
  });
  if (!employee) {
    throw new ValidationError("Department head must be an existing employee.");
  }
}

async function checkEffectiveDateNotAfterChildOrg(
  orgId: number,
  effectiveDate: Date | string,
  tx: TxClient,
): Promise<void> {
  const date = toMidnightUtc(effectiveDate);
  const earliestChild = await tx.adhrsOrganizationVersions.findFirst({
    where: { parentOrgId: orgId, deletedAt: null },
    select: { effectiveDate: true },
    orderBy: [{ effectiveDate: "asc" }, { id: "asc" }],
  });

  if (earliestChild && date.getTime() > earliestChild.effectiveDate.getTime()) {
    throw new ValidationError("调整组织机构的生效日期不得晚于被关联的下级组织生效日期。");
  }
}

async function normalizeOrgVersionRanges(orgId: number, tx: TxClient): Promise<void> {
  const versions = await tx.adhrsOrganizationVersions.findMany({
    where: { orgId, deletedAt: null },
    orderBy: [{ effectiveDate: "asc" }, { id: "asc" }],
  });

  for (let i = 0; i < versions.length; i += 1) {
    const next = versions[i + 1];
    await tx.adhrsOrganizationVersions.update({
      where: { id: versions[i].id },
      data: {
        expirationDate: next
          ? previousUtcDay(next.effectiveDate)
          : toMidnightUtc("9999-12-31"),
      },
    });
  }
}

async function collectOrganizationSubtreeIds(orgId: number, tx: TxClient): Promise<number[]> {
  const ids = new Set<number>([orgId]);
  let frontier = [orgId];

  while (frontier.length > 0) {
    const children = await tx.adhrsOrganizationVersions.findMany({
      where: {
        parentOrgId: { in: frontier },
        current_version: true,
        deletedAt: null,
      },
      select: { orgId: true },
      distinct: ["orgId"],
    });
    frontier = children
      .map((child) => child.orgId)
      .filter((childOrgId) => !ids.has(childOrgId));
    for (const childOrgId of frontier) ids.add(childOrgId);
  }

  return [...ids];
}

async function checkOrganizationSubtreeHasNoBindings(
  orgIds: number[],
  tx: TxClient,
): Promise<void> {
  const [positionCount, employeeCount, departmentHeadCount] = await Promise.all([
    tx.adhrsPositionVersions.count({
      where: { orgId: { in: orgIds }, deletedAt: null },
    }),
    tx.adhrsEmployeeOrgAssignment.count({
      where: { orgId: { in: orgIds }, deletedAt: null },
    }),
    tx.adhrsOrganizationVersions.count({
      where: {
        orgId: { in: orgIds },
        departmentHeadId: { not: null },
        deletedAt: null,
      },
    }),
  ]);

  if (positionCount > 0 || employeeCount > 0 || departmentHeadCount > 0) {
    throw new ValidationError("组织或其子节点存在历史、当前或未来绑定的职位/人员，不允许删除。");
  }
}

/** Trigger: Create Organization Version (initial). */
export async function createOrganization(
  input: OrgVersionInput,
): Promise<{ orgId: number; versionId: number; code: string }> {
  validateEnum("Structure type", input.structureType, STRUCTURE_TYPES);
  validateEnum("Org type", input.orgType, ORG_TYPES);
  return prisma.$transaction(async (tx) => {
    await checkParentOrgEffectiveAt(input.parentOrgId, input.effectiveDate, tx);
    await checkDepartmentHeadExists(input.departmentHeadId, tx);
    const code = await generateOrganizationCode(input.prefix ?? "ORG", tx);
    const org = await tx.adhrsOrganizations.create({
      data: {
        code,
        orgName: input.name,
        status: true,
        structureType: input.structureType ?? null,
        versions: { create: versionData(input) },
      },
      include: { versions: true },
    });
    await normalizeOrgVersionRanges(org.id, tx);
    await updateOrgAsCurrentVersion(org.id, tx);
    return { orgId: org.id, versionId: org.versions[0].id, code };
  });
}

/** Trigger: Create Organization Version (subsequent). */
export async function addOrganizationVersion(
  orgId: number,
  input: OrgVersionInput,
): Promise<{ versionId: number }> {
  validateEnum("Org type", input.orgType, ORG_TYPES);
  return prisma.$transaction(async (tx) => {
    await checkNoDuplicateVersionEffectiveDate("organization", orgId, input.effectiveDate, undefined, tx);
    await checkEffectiveDateNotBeforeFirstVersion("organization", orgId, input.effectiveDate, tx);
    await checkParentOrgEffectiveAt(input.parentOrgId, input.effectiveDate, tx);
    await checkDepartmentHeadExists(input.departmentHeadId, tx);
    await checkNoHierarchyCycle("organization", orgId, input.parentOrgId, tx);
    const effectiveDate = toMidnightUtc(input.effectiveDate);
    const deletedVersion = await tx.adhrsOrganizationVersions.findFirst({
      where: { orgId, effectiveDate, deletedAt: { not: null } },
      select: { id: true },
    });
    const data = { orgId, ...versionData(input) };
    const v = deletedVersion
      ? await tx.adhrsOrganizationVersions.update({
          where: { id: deletedVersion.id },
          data: { ...data, deletedAt: null },
        })
      : await tx.adhrsOrganizationVersions.create({ data });
    await normalizeOrgVersionRanges(orgId, tx);
    await updateOrgAsCurrentVersion(orgId, tx);
    return { versionId: v.id };
  });
}

/** Trigger: Edit Organization Version — correction and controlled timeline movement. */
export async function editOrganizationVersion(
  versionId: number,
  patch: Partial<Pick<OrgVersionInput, "name" | "orgType" | "parentOrgId" | "costCenterCode" | "departmentHeadId" | "effectiveDate">>,
): Promise<void> {
  validateEnum("Org type", patch.orgType, ORG_TYPES);
  return prisma.$transaction(async (tx) => {
    const v = await tx.adhrsOrganizationVersions.findUnique({ where: { id: versionId } });
    if (!v) throw new NotFoundError("Organization Version", versionId);

    const effectiveDate = patch.effectiveDate ? toMidnightUtc(patch.effectiveDate) : v.effectiveDate;
    const parentOrgId = patch.parentOrgId !== undefined ? patch.parentOrgId : v.parentOrgId ?? undefined;

    if (patch.effectiveDate && effectiveDate.getTime() !== v.effectiveDate.getTime()) {
      await checkVersionEffectiveDateMove("organization", v.orgId, versionId, effectiveDate, tx);
      await checkEffectiveDateNotAfterChildOrg(v.orgId, effectiveDate, tx);
    }
    if (patch.parentOrgId !== undefined || patch.effectiveDate) {
      await checkParentOrgEffectiveAt(parentOrgId, effectiveDate, tx);
      await checkNoHierarchyCycle("organization", v.orgId, parentOrgId, tx);
    }
    if (patch.departmentHeadId !== undefined) {
      await checkDepartmentHeadExists(patch.departmentHeadId, tx);
    }
    await tx.adhrsOrganizationVersions.update({
      where: { id: versionId },
      data: {
        ...(patch.name !== undefined ? { orgName: patch.name } : {}),
        ...(patch.orgType !== undefined ? { orgType: patch.orgType } : {}),
        ...(patch.costCenterCode !== undefined ? { costCenterCode: patch.costCenterCode } : {}),
        ...(patch.departmentHeadId !== undefined ? { departmentHeadId: patch.departmentHeadId } : {}),
        ...(patch.parentOrgId !== undefined ? { parentOrgId: patch.parentOrgId } : {}),
        ...(patch.effectiveDate !== undefined ? { effectiveDate } : {}),
      },
    });
    await normalizeOrgVersionRanges(v.orgId, tx);
    await updateOrgAsCurrentVersion(v.orgId, tx);
  });
}

/** Delete: Organization Version — soft-delete non-initial version, repair active ranges, recompute current. */
export async function deleteOrganizationVersion(
  versionId: number,
  tx?: TxClient,
): Promise<{ orgId: number }> {
  return withTx(tx, async (t) => {
    const v = await t.adhrsOrganizationVersions.findUnique({ where: { id: versionId } });
    if (!v) throw new NotFoundError("Organization Version", versionId);
    await checkNotLastVersion("organization", v.orgId, t);
    await checkNotFirstVersion("organization", v.orgId, versionId, t);
    await t.adhrsOrganizationVersions.update({
      where: { id: versionId },
      data: { deletedAt: new Date(), current_version: false },
    });
    await normalizeOrgVersionRanges(v.orgId, t);
    await updateOrgAsCurrentVersion(v.orgId, t);
    return { orgId: v.orgId };
  });
}

/** Delete organization master + all descendants only when the whole subtree is unbound. */
export async function deleteOrganization(orgId: number): Promise<void> {
  return prisma.$transaction(async (tx) => {
    const org = await tx.adhrsOrganizations.findFirst({
      where: { id: orgId, deletedAt: null },
      select: { id: true },
    });
    if (!org) throw new NotFoundError("Organization", orgId);

    const subtreeIds = await collectOrganizationSubtreeIds(orgId, tx);
    await checkOrganizationSubtreeHasNoBindings(subtreeIds, tx);

    const now = new Date();
    await tx.adhrsOrganizationVersions.updateMany({
      where: { orgId: { in: subtreeIds }, deletedAt: null },
      data: { deletedAt: now, current_version: false },
    });
    await tx.adhrsOrganizations.updateMany({
      where: { id: { in: subtreeIds }, deletedAt: null },
      data: { deletedAt: now, status: false },
    });
  });
}
