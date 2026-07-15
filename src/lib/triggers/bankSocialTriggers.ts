// Bank account + social security triggers.
//   Trigger: Create / Update Bank Account -> Fn: Set Bank Account Current Version
//   Check:   New Bank Account Version Pre-Check (no duplicate effective_date)
// (same shape for Social Security)
// The precheck, the upsert, and the current-version recompute all run in ONE
// transaction so concurrent same-effectiveDate writes can't bypass the guard.

import { NotFoundError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { toMidnightUtc } from "@/lib/datetime";
import {
  setBankAccountCurrentVersion,
  setSocialSecurityCurrentVersion,
} from "@/lib/versioning";
import { checkNoDuplicateEffectiveDate } from "@/lib/prechecks";

export interface BankAccountInput {
  employeeId: number;
  employeeVersionId?: number;
  accountHolderName: string;
  bankId?: number;
  currencyId?: number;
  countryId?: number;
  effectiveDate: Date | string;
  attachment?: unknown;
}

/** Trigger: Create / Update Bank Account. */
export async function upsertBankAccount(
  input: BankAccountInput,
  id?: number,
): Promise<{ bankAccountId: number }> {
  return prisma.$transaction(async (tx) => {
    await checkNoDuplicateEffectiveDate("bank_account", input.employeeId, input.effectiveDate, id, tx);
    const existing = id
      ? await tx.adhrs_employee_bank_account.findUnique({ where: { id } })
      : null;
    if (id && !existing) throw new NotFoundError("Bank Account", id);
    const row = await (id
      ? tx.adhrs_employee_bank_account.update({
          where: { id },
          data: {
            account_holder_name: input.accountHolderName,
            bank_id: input.bankId ?? null,
            currency_id: input.currencyId ?? null,
            country_id: input.countryId ?? null,
            effective_date: toMidnightUtc(input.effectiveDate),
            ...(input.attachment ? { attachment: input.attachment as never } : {}),
          },
        })
      : tx.adhrs_employee_bank_account.create({
          data: {
            employee_id: input.employeeId,
            employee_version_id: input.employeeVersionId ?? null,
            account_holder_name: input.accountHolderName,
            bank_id: input.bankId ?? null,
            currency_id: input.currencyId ?? null,
            country_id: input.countryId ?? null,
            effective_date: toMidnightUtc(input.effectiveDate),
            current_version: false,
            ...(input.attachment ? { attachment: input.attachment as never } : {}),
          },
        }));
    await setBankAccountCurrentVersion(input.employeeId, tx);
    return { bankAccountId: row.id };
  });
}

export interface SocialSecurityInput {
  employeeId: number;
  employeeVersionId?: number;
  sscn?: string;
  hpfAccount?: string;
  title?: string;
  spouse?: string;
  spouseIdNumber?: string;
  firstTimeToCheckSocialInsurance?: boolean;
  effectiveDate: Date | string;
}

/** Trigger: Create / Update Social Security Version. */
export async function upsertSocialSecurity(
  input: SocialSecurityInput,
  id?: number,
): Promise<{ socialSecurityId: number }> {
  return prisma.$transaction(async (tx) => {
    await checkNoDuplicateEffectiveDate("social_security", input.employeeId, input.effectiveDate, id, tx);
    const existing = id
      ? await tx.adhrs_employee_social_security.findUnique({ where: { id } })
      : null;
    if (id && !existing) throw new NotFoundError("Social Security", id);
    const row = await (id
      ? tx.adhrs_employee_social_security.update({
          where: { id },
          data: {
            sscn: input.sscn ?? null,
            hpf_account: input.hpfAccount ?? null,
            title: input.title ?? null,
            spouse: input.spouse ?? null,
            spouse_id_number: input.spouseIdNumber ?? null,
            first_time_to_check_social_insurance: input.firstTimeToCheckSocialInsurance ?? false,
            effective_date: toMidnightUtc(input.effectiveDate),
          },
        })
      : tx.adhrs_employee_social_security.create({
          data: {
            employee_id: input.employeeId,
            employee_version_id: input.employeeVersionId ?? null,
            sscn: input.sscn ?? null,
            hpf_account: input.hpfAccount ?? null,
            title: input.title ?? null,
            spouse: input.spouse ?? null,
            spouse_id_number: input.spouseIdNumber ?? null,
            first_time_to_check_social_insurance: input.firstTimeToCheckSocialInsurance ?? false,
            effective_date: toMidnightUtc(input.effectiveDate),
            current_version: false,
          },
        }));
    await setSocialSecurityCurrentVersion(input.employeeId, tx);
    return { socialSecurityId: row.id };
  });
}
