import type { TxClient } from "@/lib/prisma";
import { pickByEffectiveDate, withTx } from "./_shared";

/**
 * Fn: Update Org as Current Version — pick the org's current version by
 * effectiveDate, sync `adhrsOrganizations.name`, set current_version=true on
 * the chosen version and false on the rest.
 */
export async function updateOrgAsCurrentVersion(
  orgId: number,
  tx?: TxClient,
): Promise<{ currentVersionId: number | null }> {
  return withTx(tx, async (t) => {
    const versions = await t.adhrsOrganizationVersions.findMany({
      where: { orgId, deletedAt: null },
      orderBy: [{ effectiveDate: "asc" }, { id: "asc" }],
    });
    const current = pickByEffectiveDate(versions, (v) => v.effectiveDate, (v) => v.expirationDate);

    if (current) {
      await t.adhrsOrganizations.update({ where: { id: orgId }, data: { orgName: current.orgName } });
      await t.adhrsOrganizationVersions.updateMany({
        where: { id: current.id },
        data: { current_version: true },
      });
      await t.adhrsOrganizationVersions.updateMany({
        where: { orgId, NOT: { id: current.id } },
        data: { current_version: false },
      });
    } else {
      // No version effective yet — clear all flags.
      await t.adhrsOrganizationVersions.updateMany({
        where: { orgId },
        data: { current_version: false },
      });
    }
    return { currentVersionId: current?.id ?? null };
  });
}
