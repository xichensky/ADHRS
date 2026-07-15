// Personal-data infotype trigger. Independent effective-dated timeline (NOT
// coupled to employee_versions). upsert = precheck (dup effectiveDate, email,
// id-doc) -> write -> setBasicInfoCurrentVersion, all in one transaction.

import { NotFoundError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { toMidnightUtc } from "@/lib/datetime";
import { setBasicInfoCurrentVersion } from "@/lib/versioning";
import {
  checkNoDuplicateEffectiveDate,
  checkEmailUnique,
  checkIdDocumentNumberUnique,
} from "@/lib/prechecks";
import { validateEnum } from "@/lib/validation";
import { GENDERS, DEGREES, MARITAL_STATUSES, HEALTH_STATUSES } from "@/lib/types";

export interface BasicInfoInput {
  name: string;
  localLanguageName?: string;
  gender?: string;
  birthDate?: Date | string;
  email?: string;
  mobilePhone?: string;
  homeTel?: string;
  idDocumentTypeId?: number;
  idDocumentNumber?: string;
  idDocumentAddress?: string;
  countryId?: number;
  nationality?: string;
  photoUrl?: string;
  province?: string;
  city?: string;
  district?: string;
  homeAddressDetails?: string;
  mailingAddress?: string;
  hukouLocation?: string;
  placeOfBirth?: string;
  maritalStatus?: string;
  healthStatus?: string;
  degree?: string;
  effectiveDate: Date | string;
  expirationDate?: Date | string;
  employeeVersionId?: number;
}

function personData(i: BasicInfoInput) {
  return {
    name: i.name,
    local_language_name: i.localLanguageName ?? null,
    gender: i.gender ?? null,
    birth_date: i.birthDate ? toMidnightUtc(i.birthDate) : null,
    email: i.email ? i.email.trim().toLowerCase() : null,
    mobile_phone: i.mobilePhone ?? null,
    home_tel: i.homeTel ?? null,
    id_document_type_id: i.idDocumentTypeId ?? null,
    id_document_number: i.idDocumentNumber ? i.idDocumentNumber.trim().toUpperCase() : null,
    id_document_address: i.idDocumentAddress ?? null,
    country_id: i.countryId ?? null,
    nationality: i.nationality ?? null,
    photo_url: i.photoUrl ?? null,
    province: i.province ?? null,
    city: i.city ?? null,
    district: i.district ?? null,
    home_address_details: i.homeAddressDetails ?? null,
    mailing_address: i.mailingAddress ?? null,
    hukou_location: i.hukouLocation ?? null,
    place_of_birth: i.placeOfBirth ?? null,
    marital_status: i.maritalStatus ?? null,
    health_status: i.healthStatus ?? null,
    degree: i.degree ?? null,
    effectiveDate: toMidnightUtc(i.effectiveDate),
    expirationDate: i.expirationDate ? toMidnightUtc(i.expirationDate) : null,
  };
}

/** Trigger: Create / Update Person (personal-data infotype). */
export async function upsertBasicInfo(
  employeeId: number,
  input: BasicInfoInput,
  id?: number,
): Promise<{ personId: number }> {
  validateEnum("Gender", input.gender, GENDERS);
  validateEnum("Degree", input.degree, DEGREES);
  validateEnum("Marital status", input.maritalStatus, MARITAL_STATUSES);
  validateEnum("Health status", input.healthStatus, HEALTH_STATUSES);
  return prisma.$transaction(async (tx) => {
    await checkNoDuplicateEffectiveDate("person", employeeId, input.effectiveDate, id, tx);
    await checkEmailUnique(input.email, employeeId, tx);
    await checkIdDocumentNumberUnique(input.idDocumentNumber, employeeId, tx);
    const existing = id ? await tx.adhrs_employee_basic_info.findUnique({ where: { id } }) : null;
    if (id && !existing) throw new NotFoundError("Basic Info", id);
    const row = await (id
      ? tx.adhrs_employee_basic_info.update({ where: { id }, data: personData(input) })
      : tx.adhrs_employee_basic_info.create({
          data: { employee_id: employeeId, employee_version_id: input.employeeVersionId ?? null, current_version: false, ...personData(input) },
        }));
    await setBasicInfoCurrentVersion(employeeId, tx);
    return { personId: row.id };
  });
}

/** Soft-delete a person record. */
export async function deleteBasicInfo(id: number): Promise<void> {
  const row = await prisma.adhrs_employee_basic_info.findUnique({ where: { id } });
  if (!row) throw new NotFoundError("Basic Info", id);
  await prisma.adhrs_employee_basic_info.update({ where: { id }, data: { deletedAt: new Date(), current_version: false } });
  await setBasicInfoCurrentVersion(row.employee_id);
}
