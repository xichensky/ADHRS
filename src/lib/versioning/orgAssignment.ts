import type { TxClient } from "@/lib/prisma";
import { pickByEffectiveDate, withTx } from "./_shared";

/**
 * Fn: Update Employee as Current Version — manages ONLY the org-assignment
 * (employee_versions) timeline: pick current by effectiveDate, flip version flags.
 *
 * The employee's name is NOT synced here — it is a personal-data attribute owned
 * by basic_info; see setBasicInfoCurrentVersion. Personal data / compensation /
 * bank / social are INDEPENDENT infotypes with their own currency functions;
 * they are NOT flipped here. This decouples "org assignment changed" from
 * "personal data changed".
 */
export async function updateOrgAssignmentAsCurrent(
  employeeId: number,
  tx?: TxClient,
): Promise<{ currentVersionId: number | null }> {
  return withTx(tx, async (t) => {
    const versions = await t.adhrsEmployeeOrgAssignment.findMany({
      where: { employeeId, deletedAt: null },
      orderBy: [{ effectiveDate: "asc" }, { id: "asc" }],
    });
    const current = pickByEffectiveDate(versions, (v) => v.effectiveDate, (v) => v.expirationDate);

    if (current) {
      await t.adhrsEmployeeOrgAssignment.updateMany({
        where: { id: current.id },
        data: { current_version: true },
      });
      await t.adhrsEmployeeOrgAssignment.updateMany({
        where: { employeeId, NOT: { id: current.id } },
        data: { current_version: false },
      });
    } else {
      await t.adhrsEmployeeOrgAssignment.updateMany({
        where: { employeeId },
        data: { current_version: false },
      });
    }
    return { currentVersionId: current?.id ?? null };
  });
}
