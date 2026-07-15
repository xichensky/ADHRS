import type { TxClient } from "@/lib/prisma";
import { pickByEffectiveDate, withTx } from "./_shared";

/**
 * Fn: Update Position as Current Version — pick by effectiveDate, sync
 * `adhrsPositions.name`, flip current_version flags.
 */
export async function updatePositionAsCurrentVersion(
  positionId: number,
  tx?: TxClient,
): Promise<{ currentVersionId: number | null }> {
  return withTx(tx, async (t) => {
    const versions = await t.adhrsPositionVersions.findMany({
      where: { positionId, deletedAt: null },
      orderBy: [{ effectiveDate: "asc" }, { id: "asc" }],
    });
    const current = pickByEffectiveDate(versions, (v) => v.effectiveDate, (v) => v.expirationDate);

    if (current) {
      await t.adhrsPositions.update({ where: { id: positionId }, data: { positionName: current.positionName } });
      await t.adhrsPositionVersions.updateMany({
        where: { id: current.id },
        data: { current_version: true },
      });
      await t.adhrsPositionVersions.updateMany({
        where: { positionId, NOT: { id: current.id } },
        data: { current_version: false },
      });
    } else {
      await t.adhrsPositionVersions.updateMany({
        where: { positionId },
        data: { current_version: false },
      });
    }
    return { currentVersionId: current?.id ?? null };
  });
}
