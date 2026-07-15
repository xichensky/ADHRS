import type { TxClient } from "@/lib/prisma";
import { pickByEffectiveDate, withTx } from "./_shared";

/** Fn: Set Bank Account Current Version — pick current by effective_date. */
export async function setBankAccountCurrentVersion(
  employeeId: number,
  tx?: TxClient,
): Promise<{ currentVersionId: number | null }> {
  return withTx(tx, async (t) => {
    const items = await t.adhrs_employee_bank_account.findMany({
      where: { employee_id: employeeId, deletedAt: null },
      orderBy: [{ effective_date: "asc" }, { id: "asc" }],
    });
    const current = pickByEffectiveDate(items, (i) => i.effective_date, () => null);
    if (current) {
      await t.adhrs_employee_bank_account.updateMany({
        where: { id: current.id },
        data: { current_version: true },
      });
      await t.adhrs_employee_bank_account.updateMany({
        where: { employee_id: employeeId, NOT: { id: current.id }, deletedAt: null },
        data: { current_version: false },
      });
    } else {
      await t.adhrs_employee_bank_account.updateMany({
        where: { employee_id: employeeId, deletedAt: null },
        data: { current_version: false },
      });
    }
    return { currentVersionId: current?.id ?? null };
  });
}
