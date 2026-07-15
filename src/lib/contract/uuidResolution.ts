// Query-or-create pattern against the three HRS↔CMS mapping tables.
// Returns the CMS UUID if a mapping already exists; otherwise calls the CMS
// adapter to create it, persists the mapping, and returns the new UUID.

import { NotFoundError } from "@/lib/errors";
import { prisma, type TxClient } from "@/lib/prisma";
import { cms } from "@/lib/cms";

/** Resolve (or create) the CMS person UUID for an employee. */
export async function queryOrCreateContractPerson(
  employeeId: number,
  employeeVersionId?: number,
  tx?: TxClient,
): Promise<string> {
  const db = tx ?? prisma;
  const existing = await db.adhrs_employee_contract_person_relation.findFirst({
    where: { employee_id: employeeId, deletedAt: null },
    orderBy: { id: "desc" },
  });
  if (existing) return existing.contract_person_uuid;

  const person = await db.adhrs_employee_basic_info.findFirst({
    where: { employee_id: employeeId, deletedAt: null },
    orderBy: [{ current_version: "desc" }, { id: "desc" }],
  });
  const employee = await db.adhrsEmployees.findUnique({ where: { id: employeeId } });
  if (!employee) throw new NotFoundError("Employee", employeeId);

  const uuid = await cms.createPerson({
    employeeId,
    name: person?.name ?? employee.name,
    email: person?.email,
    idDocumentNumber: person?.id_document_number,
  });
  await db.adhrs_employee_contract_person_relation.create({
    data: {
      employee_id: employeeId,
      employee_version_id: employeeVersionId ?? person?.employee_version_id ?? null,
      contract_person_uuid: uuid,
    },
  });
  return uuid;
}

/** Resolve (or create) the CMS legal-entity UUID. */
export async function queryOrCreateContractLegalEntity(
  legalEntityId: number,
  tx?: TxClient,
): Promise<string> {
  const db = tx ?? prisma;
  const existing = await db.adhrs_hrs_cms_legal_entity_realtion.findFirst({
    where: { legal_entity_id: legalEntityId, deletedAt: null },
  });
  if (existing) return existing.cms_legal_entity_uuid;

  const le = await db.adhrs_legal_entity.findUnique({ where: { id: legalEntityId } });
  if (!le) throw new NotFoundError("Legal Entity", legalEntityId);

  const uuid = await cms.createLegalEntity({
    legalEntityId,
    entityName: le.entity_name,
    registerNumber: le.register_number,
  });
  await db.adhrs_hrs_cms_legal_entity_realtion.create({
    data: { legal_entity_id: legalEntityId, cms_legal_entity_uuid: uuid },
  });
  return uuid;
}

/** Resolve (or create) the CMS contract-type UUID. */
export async function queryOrCreateContractType(
  contractTypeId: number,
  tx?: TxClient,
): Promise<string> {
  const db = tx ?? prisma;
  const existing = await db.adhrs_hrs_cms_contract_type_realtion.findFirst({
    where: { contract_type_id: contractTypeId, deletedAt: null },
  });
  if (existing) return existing.cms_contract_type_uuid;

  const ct = await db.adhrs_hrs_contract_type.findUnique({ where: { id: contractTypeId } });
  if (!ct) throw new NotFoundError("Contract Type", contractTypeId);

  const uuid = await cms.createContractType({
    contractTypeId,
    code: ct.code,
    name: ct.name,
  });
  await db.adhrs_hrs_cms_contract_type_realtion.create({
    data: { contract_type_id: contractTypeId, cms_contract_type_uuid: uuid },
  });
  return uuid;
}
