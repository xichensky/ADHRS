// Contract trigger — mirrors the report's
//   Trigger: Create Contract  (generateContractVariables -> upsert seq -> push to CMS)
//   Check:    New Contract Pre-Check (contract_no uniqueness — guaranteed by seq)
//
// contract_no is GENERATED from (type, day, seq), so it is unique by construction.

import { NotFoundError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { toMidnightUtc } from "@/lib/datetime";
import { generateContractVariables, pushHrsContractToCms } from "@/lib/contract";

export interface ContractInput {
  contractTypeId: number;
  title?: string;
  employeeId?: number;
  employeeVersionId?: number;
  legalEntityIds?: number[];
  actionType?: string;
  termType?: string;
  status?: string;
  signDate?: Date | string;
  effectiveDate?: Date | string;
  expireDate?: Date | string;
  terminateDate?: Date | string;
}

/** Trigger: Create Contract — gen vars, persist, push to CMS, write back uuid. */
export async function createContract(
  input: ContractInput,
): Promise<{ contractId: number; contractNo: string; cmsUuid: string }> {
  const vars = await generateContractVariables(input.contractTypeId, new Date());
  const contract = await prisma.$transaction(async (tx) => {
    return tx.adhrs_contract.create({
      data: {
        conctract_no: vars.contractNo,
        contract_title: input.title ?? null,
        contract_type_id: input.contractTypeId,
        employee_id: input.employeeId ?? null,
        employee_version_id: input.employeeVersionId ?? null,
        action_type: input.actionType ?? null,
        term_type: input.termType ?? null,
        status: input.status ?? "Draft",
        sign_date: input.signDate ? toMidnightUtc(input.signDate) : null,
        effective_date: input.effectiveDate ? toMidnightUtc(input.effectiveDate) : null,
        expire_date: input.expireDate ? toMidnightUtc(input.expireDate) : null,
        terminate_date: input.terminateDate ? toMidnightUtc(input.terminateDate) : null,
        legalEntityRelations:
          input.legalEntityIds && input.legalEntityIds.length
            ? { create: input.legalEntityIds.map((id) => ({ legal_entity_id: id })) }
            : undefined,
      },
    });
  });

  // Push to CMS AFTER the contract row commits (network boundary).
  const { cmsContractUuid } = await pushHrsContractToCms(contract.id);
  return { contractId: contract.id, contractNo: vars.contractNo, cmsUuid: cmsContractUuid };
}

/** Soft-delete a contract + its legal-entity relations. */
export async function deleteContract(contractId: number): Promise<void> {
  const now = new Date();
  await prisma.$transaction(async (tx) => {
    const c = await tx.adhrs_contract.findUnique({ where: { id: contractId } });
    if (!c) throw new NotFoundError("Contract", contractId);
    await tx.adhrs_contract.update({ where: { id: contractId }, data: { deletedAt: now } });
    await tx.adhrs_legal_entity_contract_relation.updateMany({
      where: { contract_id: contractId, deletedAt: null },
      data: { deletedAt: now },
    });
  });
}
