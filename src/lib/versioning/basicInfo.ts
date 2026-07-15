import type { TxClient } from "@/lib/prisma";
import { pickByEffectiveDate, withTx } from "./_shared";

/**
 * Fn: Set Person Current Version — independent infotype currency. Picks the
 * current person by its OWN effectiveDate/expirationDate (NOT via the employee
 * version). This decouples personal-data history from org-assignment history.
 *
 * The employee's name is a personal-data attribute, so the master
 * adhrsEmployees.name is synced FROM the current basic_info row here.
 */
export async function setBasicInfoCurrentVersion(
  employeeId: number,
  tx?: TxClient,
): Promise<{ currentVersionId: number | null }> {
  return withTx(tx, async (t) => {
    const items = await t.adhrs_employee_basic_info.findMany({
      where: { employee_id: employeeId, deletedAt: null },
      orderBy: [{ effectiveDate: "asc" }, { id: "asc" }],
    });
    const current = pickByEffectiveDate(items, (i) => i.effectiveDate, (i) => i.expirationDate);
    if (current) {
      await t.adhrsEmployees.update({
        where: { id: employeeId },
        data: { name: current.name },
      });
      await t.adhrs_employee_basic_info.updateMany({
        where: { id: current.id },
        data: { current_version: true },
      });
      await t.adhrs_employee_basic_info.updateMany({
        where: { employee_id: employeeId, NOT: { id: current.id }, deletedAt: null },
        data: { current_version: false },
      });
    } else {
      await t.adhrs_employee_basic_info.updateMany({
        where: { employee_id: employeeId, deletedAt: null },
        data: { current_version: false },
      });
    }
    return { currentVersionId: current?.id ?? null };
  });
}
