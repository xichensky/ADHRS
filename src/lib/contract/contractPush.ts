// Fn: Push HRS Contract to CMS — aggregate workflow. Ensure person / legalEntity
// / contractType UUIDs, assemble the contract party, call the CMS adapter, and
// on success write back `cms_contract_uuid` to the contract row.

import { NotFoundError } from "@/lib/errors";
import { prisma, type TxClient } from "@/lib/prisma";
import { cms } from "@/lib/cms";
import {
  queryOrCreateContractPerson,
  queryOrCreateContractLegalEntity,
  queryOrCreateContractType,
} from "./uuidResolution";

export async function pushHrsContractToCms(
  contractId: number,
  tx?: TxClient,
): Promise<{ cmsContractUuid: string }> {
  const db = tx ?? prisma;
  const contract = await db.adhrs_contract.findUnique({
    where: { id: contractId },
    include: { legalEntityRelations: true },
  });
  if (!contract) throw new NotFoundError("Contract", contractId);

  // Resolve person UUID (needs an employee).
  const personUuid = contract.employee_id
    ? await queryOrCreateContractPerson(contract.employee_id, contract.employee_version_id ?? undefined, db)
    : "";

  // Resolve legal-entity UUIDs (loop, supports multi-party).
  const legalEntityUuids: string[] = [];
  for (const rel of contract.legalEntityRelations) {
    legalEntityUuids.push(await queryOrCreateContractLegalEntity(rel.legal_entity_id, db));
  }

  // Resolve contract-type UUID.
  const contractTypeUuid = contract.contract_type_id
    ? await queryOrCreateContractType(contract.contract_type_id, db)
    : "";

  const cmsUuid = await cms.createContract({
    contractNo: contract.conctract_no,
    title: contract.contract_title,
    personUuid,
    legalEntityUuids,
    contractTypeUuid,
    signDate: contract.sign_date?.toISOString() ?? null,
    effectiveDate: contract.effective_date?.toISOString() ?? null,
    expireDate: contract.expire_date?.toISOString() ?? null,
  });

  await db.adhrs_contract.update({
    where: { id: contractId },
    data: { cms_contract_uuid: cmsUuid },
  });
  return { cmsContractUuid: cmsUuid };
}
