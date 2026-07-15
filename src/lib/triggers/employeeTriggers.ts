// Employee triggers — the most complex orchestrator. Mirrors the report's
//   Trigger: Create Employee Version  (precheck -> codegen -> master+version+person+onboard -> current)
//   Trigger: Edit Employee Version
//   Delete:   Employee Version  (last-version guard + recompute)
//
// Deviations (documented): the report auto-pushes a contract when an employee
// version is created; v1 creates contracts explicitly (see contractTriggers) to
// avoid hard deps on contract-type/legal-entity. QIS push is an empty
// placeholder in the source, so omitted here. Every multi-step mutation runs in
// one transaction.

import { NotFoundError, ValidationError } from "@/lib/errors";
import { prisma, type TxClient } from "@/lib/prisma";
import { toMidnightUtc, previousUtcDay } from "@/lib/datetime";
import { generateEmployeeCode, getCodePrefix } from "@/lib/codegen";
import {
  updateOrgAssignmentAsCurrent,
  setBasicInfoCurrentVersion,
  withTx,
} from "@/lib/versioning";
import {
  checkEffectiveDateNotBeforeFirstVersion,
  checkEmailUnique,
  checkIdDocumentNumberUnique,
  checkNotFirstVersion,
  checkNotLastVersion,
  checkNoDuplicateVersionEffectiveDate,
} from "@/lib/prechecks";
import { validateEnum } from "@/lib/validation";
import {
  EMPLOYMENT_TYPES,
  GENDERS,
  DEGREES,
  MARITAL_STATUSES,
  HEALTH_STATUSES,
  ORG_EVENT_TYPES,
} from "@/lib/types";

export interface BasicInfoSeedInput {
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
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelationship?: string;
}

export interface OrgAssignmentInput {
  hireDate?: Date | string;
  orgId?: number;
  positionId?: number;
  secondaryPositionId?: number;
  reportToEmployeeId?: number;
  operationalLeaderEmployeeId?: number;
  functionalLeaderEmployeeId?: number;
  officeLocation?: string;
  workLocation?: string;
  employmentType?: string;
  eventType?: string;
  eventReason?: string;
  managingPeopleOrNot?: boolean;
  effectiveDate: Date | string;
  expirationDate?: Date | string;
  /** code prefix; derived from the org code if omitted */
  prefix?: string;
}

function versionData(i: OrgAssignmentInput) {
  return {
    orgId: i.orgId ?? null,
    positionId: i.positionId ?? null,
    secondaryPositionId: i.secondaryPositionId ?? null,
    reportToEmployeeId: i.reportToEmployeeId ?? null,
    operationalLeaderEmployeeId: i.operationalLeaderEmployeeId ?? null,
    functionalLeaderEmployeeId: i.functionalLeaderEmployeeId ?? null,
    office_location: i.officeLocation ?? null,
    work_location: i.workLocation ?? null,
    employment_type: i.employmentType ?? null,
    event_type: i.eventType ?? null,
    event_reason: i.eventReason ?? null,
    managing_people_or_not: i.managingPeopleOrNot ?? false,
    effectiveDate: toMidnightUtc(i.effectiveDate),
    expirationDate: null,
    current_version: false,
  };
}

async function normalizeOrgAssignmentRanges(employeeId: number, tx: TxClient): Promise<void> {
  const versions = await tx.adhrsEmployeeOrgAssignment.findMany({
    where: { employeeId, deletedAt: null },
    orderBy: [{ effectiveDate: "asc" }, { id: "asc" }],
  });

  for (let i = 0; i < versions.length; i += 1) {
    const next = versions[i + 1];
    await tx.adhrsEmployeeOrgAssignment.update({
      where: { id: versions[i].id },
      data: {
        expirationDate: next
          ? previousUtcDay(next.effectiveDate)
          : toMidnightUtc("9999-12-31"),
      },
    });
  }
}

function validateBasicInfo(p: BasicInfoSeedInput) {
  validateEnum("Gender", p.gender, GENDERS);
  validateEnum("Degree", p.degree, DEGREES);
  validateEnum("Marital status", p.maritalStatus, MARITAL_STATUSES);
  validateEnum("Health status", p.healthStatus, HEALTH_STATUSES);
}

async function checkOrgIsActiveAt(
  orgId: number | null | undefined,
  effectiveDate: Date | string,
  tx: TxClient,
): Promise<void> {
  if (!orgId) return;
  const date = toMidnightUtc(effectiveDate);
  const org = await tx.adhrsOrganizations.findFirst({
    where: {
      id: orgId,
      deletedAt: null,
      versions: {
        some: {
          deletedAt: null,
          effectiveDate: { lte: date },
          OR: [{ expirationDate: null }, { expirationDate: { gte: date } }],
        },
      },
    },
    select: { id: true },
  });
  if (!org) throw new ValidationError("所属组织必须在该生效日期当天有效。");
}

async function resolvePrefix(i: OrgAssignmentInput, tx: TxClient): Promise<string> {
  if (i.prefix) return i.prefix;
  if (i.orgId) {
    const org = await tx.adhrsOrganizations.findFirst({
      where: { id: i.orgId, deletedAt: null },
    });
    if (org) return getCodePrefix(org.code);
  }
  return "EMP";
}

/** Trigger: Create Employee Version (initial) — with person profile + onboard record. */
export async function createEmployee(
  vInput: OrgAssignmentInput,
  person: BasicInfoSeedInput,
): Promise<{ employeeId: number; versionId: number; code: string }> {
  validateEnum("Employment type", vInput.employmentType, EMPLOYMENT_TYPES);
  validateBasicInfo(person);
  // The first org-assignment version is, by definition, the onboarding event.
  vInput.eventType = "Onboard";
  validateEnum("Event type", vInput.eventType, ORG_EVENT_TYPES);
  return prisma.$transaction(async (tx) => {
    // prechecks (email + id uniqueness)
    await checkEmailUnique(person.email, undefined, tx);
    await checkIdDocumentNumberUnique(person.idDocumentNumber, undefined, tx);
    await checkOrgIsActiveAt(vInput.orgId, vInput.effectiveDate, tx);

    const prefix = await resolvePrefix(vInput, tx);
    const code = await generateEmployeeCode(prefix, tx);

    const employee = await tx.adhrsEmployees.create({
      data: {
        code,
        name: person.name,
        status: true,
        hireDate: toMidnightUtc(vInput.hireDate ?? vInput.effectiveDate),
        versions: { create: versionData(vInput) },
      },
      include: { versions: true },
    });
    const versionId = employee.versions[0].id;

    await tx.adhrs_employee_basic_info.create({
      data: {
        employee_id: employee.id,
        employee_version_id: versionId,
        name: person.name,
        local_language_name: person.localLanguageName ?? null,
        gender: person.gender ?? null,
        birth_date: person.birthDate ? toMidnightUtc(person.birthDate) : null,
        email: person.email ? person.email.trim().toLowerCase() : null,
        mobile_phone: person.mobilePhone ?? null,
        home_tel: person.homeTel ?? null,
        id_document_type_id: person.idDocumentTypeId ?? null,
        id_document_number: person.idDocumentNumber
          ? person.idDocumentNumber.trim().toUpperCase()
          : null,
        id_document_address: person.idDocumentAddress ?? null,
        country_id: person.countryId ?? null,
        province: person.province ?? null,
        city: person.city ?? null,
        district: person.district ?? null,
        home_address_details: person.homeAddressDetails ?? null,
        mailing_address: person.mailingAddress ?? null,
        hukou_location: person.hukouLocation ?? null,
        place_of_birth: person.placeOfBirth ?? null,
        marital_status: person.maritalStatus ?? null,
        health_status: person.healthStatus ?? null,
        degree: person.degree ?? null,
        emergency_contact_name: person.emergencyContactName ?? null,
        emergency_contact_phone: person.emergencyContactPhone ?? null,
        emergency_contact_relationship: person.emergencyContactRelationship ?? null,
        current_version: false,
        effectiveDate: toMidnightUtc(vInput.effectiveDate),
      },
    });
    // personal data is its own infotype — resolve its own current independently
    await setBasicInfoCurrentVersion(employee.id, tx);

    // (The onboarding event now lives on the version row itself — event_type="Onboard"
    //  is set via versionData above; no separate event-log table is needed.)

    await normalizeOrgAssignmentRanges(employee.id, tx);
    await updateOrgAssignmentAsCurrent(employee.id, tx);
    return { employeeId: employee.id, versionId, code };
  });
}

/** Trigger: Create Employee Version (subsequent) — org-assignment only.
 *  Personal data is managed independently via upsertPerson. */
export async function addOrgAssignment(
  employeeId: number,
  input: OrgAssignmentInput,
): Promise<{ versionId: number }> {
  validateEnum("Employment type", input.employmentType, EMPLOYMENT_TYPES);
  if (!input.eventType) {
    throw new ValidationError("Event type is required.");
  }
  validateEnum("Event type", input.eventType, ORG_EVENT_TYPES);
  return prisma.$transaction(async (tx) => {
    await checkNoDuplicateVersionEffectiveDate("employee", employeeId, input.effectiveDate, undefined, tx);
    await checkEffectiveDateNotBeforeFirstVersion("employee", employeeId, input.effectiveDate, tx);
    await checkOrgIsActiveAt(input.orgId, input.effectiveDate, tx);
    const v = await tx.adhrsEmployeeOrgAssignment.create({
      data: { employeeId, ...versionData(input) },
    });
    await normalizeOrgAssignmentRanges(employeeId, tx);
    await updateOrgAssignmentAsCurrent(employeeId, tx);
    return { versionId: v.id };
  });
}

/** Delete: Employee Version — protect last, recompute current. */
export async function deleteOrgAssignment(
  versionId: number,
  tx?: TxClient,
): Promise<void> {
  return withTx(tx, async (t) => {
    const v = await t.adhrsEmployeeOrgAssignment.findUnique({ where: { id: versionId } });
    if (!v) throw new NotFoundError("Org Assignment", versionId);
    await checkNotLastVersion("employee", v.employeeId, t);
    await checkNotFirstVersion("employee", v.employeeId, versionId, t);
    await t.adhrsEmployeeOrgAssignment.delete({ where: { id: versionId } });
    await normalizeOrgAssignmentRanges(v.employeeId, t);
    await updateOrgAssignmentAsCurrent(v.employeeId, t);
  });
}
