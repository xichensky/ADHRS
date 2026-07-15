// Compensation infotype trigger. Effective-dated salary history, independent of
// employee_versions. upsert = precheck (dup effective_date) -> write ->
// setCompensationCurrentVersion, in one transaction.

import { NotFoundError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { toMidnightUtc } from "@/lib/datetime";
import { setCompensationCurrentVersion } from "@/lib/versioning";
import { checkNoDuplicateEffectiveDate } from "@/lib/prechecks";
import { validateEnum } from "@/lib/validation";
import { PAY_TYPES } from "@/lib/types";

export interface CompensationInput {
  payType?: string;
  payGrade?: string;
  payLevel?: string;
  baseSalary?: number | string;
  allowances?: unknown;
  currencyId?: number;
  bankAccountId?: number;
  effectiveDate: Date | string;
  expirationDate?: Date | string;
  attachment?: unknown;
  employeeVersionId?: number;
}

function compensationData(i: CompensationInput) {
  return {
    pay_type: i.payType ?? null,
    pay_grade: i.payGrade ?? null,
    pay_level: i.payLevel ?? null,
    base_salary: i.baseSalary ?? null,
    allowances: i.allowances ? (i.allowances as never) : undefined,
    currency_id: i.currencyId ?? null,
    bank_account_id: i.bankAccountId ?? null,
    effective_date: toMidnightUtc(i.effectiveDate),
    expiration_date: i.expirationDate ? toMidnightUtc(i.expirationDate) : null,
    attachment: i.attachment ? (i.attachment as never) : undefined,
  };
}

/** Trigger: Create / Update Compensation. */
export async function upsertCompensation(
  employeeId: number,
  input: CompensationInput,
  id?: number,
): Promise<{ compensationId: number }> {
  validateEnum("Pay type", input.payType, PAY_TYPES);
  return prisma.$transaction(async (tx) => {
    await checkNoDuplicateEffectiveDate("compensation", employeeId, input.effectiveDate, id, tx);
    const existing = id ? await tx.adhrs_employee_compensation.findUnique({ where: { id } }) : null;
    if (id && !existing) throw new NotFoundError("Compensation", id);
    const data = compensationData(input);
    const row = await (id
      ? tx.adhrs_employee_compensation.update({ where: { id }, data })
      : tx.adhrs_employee_compensation.create({
          data: { employee_id: employeeId, employee_version_id: input.employeeVersionId ?? null, current_version: false, ...data },
        }));
    await setCompensationCurrentVersion(employeeId, tx);
    return { compensationId: row.id };
  });
}

/** Soft-delete a compensation record. */
export async function deleteCompensation(id: number): Promise<void> {
  const row = await prisma.adhrs_employee_compensation.findUnique({ where: { id } });
  if (!row) throw new NotFoundError("Compensation", id);
  await prisma.adhrs_employee_compensation.update({ where: { id }, data: { deletedAt: new Date(), current_version: false } });
  await setCompensationCurrentVersion(row.employee_id);
}
