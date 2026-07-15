// Hierarchy cycle detection for organization parent links.
//
// The parent of an org lives on its CURRENT version row, so walking up
// the chain means resolving the current version at each step. We reject setting
// `parentId` as the parent of `entityId` when `entityId` is reachable upward
// from `parentId` (i.e. it would create a cycle).

import { ValidationError } from "@/lib/errors";
import { prisma, type TxClient } from "@/lib/prisma";
import { pickByEffectiveDate } from "@/lib/versioning/_shared";

const MAX_DEPTH = 100;

async function currentParentOrg(orgId: number, tx: TxClient): Promise<number | null> {
  const versions = await tx.adhrsOrganizationVersions.findMany({
    where: { orgId, deletedAt: null },
    orderBy: [{ effectiveDate: "asc" }, { id: "asc" }],
  });
  const cur = pickByEffectiveDate(versions, (v) => v.effectiveDate, (v) => v.expirationDate);
  return cur?.parentOrgId ?? null;
}

/** Reject `parentId` as the new parent of `entityId` if it would form a cycle. */
export async function checkNoHierarchyCycle(
  entity: "organization",
  entityId: number,
  parentId: number | null | undefined,
  tx: TxClient = prisma,
): Promise<void> {
  if (parentId == null) return; // root — no cycle possible
  if (parentId === entityId) {
    throw new ValidationError(`A ${entity} cannot be its own parent.`);
  }
  let cursor: number | null = parentId;
  for (let depth = 0; depth < MAX_DEPTH; depth++) {
    if (cursor === null) return; // reached a root
    if (cursor === entityId) {
      throw new ValidationError(
        `This parent would create a cycle in the ${entity} hierarchy.`,
      );
    }
    cursor = await currentParentOrg(cursor, tx);
  }
}
