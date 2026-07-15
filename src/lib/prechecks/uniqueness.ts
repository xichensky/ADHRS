// Pre-checks: uniqueness validation that throws typed errors surfaced to the UI.
// Mirrors the report's request-interception workflows (email/ID duplication,
// contract_no uniqueness, register_number uniqueness).

import { UniqueViolationError } from "@/lib/errors";
import { prisma, type TxClient } from "@/lib/prisma";

/** Check email uniqueness across all active person profiles. */
export async function checkEmailUnique(
  email: string | null | undefined,
  excludeEmployeeId?: number,
  tx: TxClient = prisma,
): Promise<void> {
  if (!email) return;
  const value = email.trim().toLowerCase();
  const count = await tx.adhrs_employee_basic_info.count({
    where: {
      email: value,
      deletedAt: null,
      ...(excludeEmployeeId ? { NOT: { employee_id: excludeEmployeeId } } : {}),
    },
  });
  if (count > 0) throw new UniqueViolationError("Email", value);
}

/** Check ID-document-number uniqueness across all active person profiles. */
export async function checkIdDocumentNumberUnique(
  idNumber: string | null | undefined,
  excludeEmployeeId?: number,
  tx: TxClient = prisma,
): Promise<void> {
  if (!idNumber) return;
  // Uppercase-normalize so behavior matches across SQLite (case-sensitive) and
  // MySQL (default collation case-insensitive) for the company's prod target.
  const value = idNumber.trim().toUpperCase();
  const count = await tx.adhrs_employee_basic_info.count({
    where: {
      id_document_number: value,
      deletedAt: null,
      ...(excludeEmployeeId ? { NOT: { employee_id: excludeEmployeeId } } : {}),
    },
  });
  if (count > 0) throw new UniqueViolationError("ID Document Number", value);
}

/** Check contract number uniqueness across all active contracts. */
export async function checkContractNoUnique(
  contractNo: string,
  excludeContractId?: number,
  tx: TxClient = prisma,
): Promise<void> {
  if (!contractNo) return;
  const count = await tx.adhrs_contract.count({
    where: {
      conctract_no: contractNo,
      deletedAt: null,
      ...(excludeContractId ? { NOT: { id: excludeContractId } } : {}),
    },
  });
  if (count > 0) throw new UniqueViolationError("Contract No.", contractNo);
}

/** Check legal-entity register-number uniqueness. */
export async function checkLegalEntityRegisterNumberUnique(
  registerNumber: string,
  excludeId?: number,
  tx: TxClient = prisma,
): Promise<void> {
  if (!registerNumber) return;
  const count = await tx.adhrs_legal_entity.count({
    where: {
      register_number: registerNumber,
      deletedAt: null,
      ...(excludeId ? { NOT: { id: excludeId } } : {}),
    },
  });
  if (count > 0) throw new UniqueViolationError("Register Number", registerNumber);
}
