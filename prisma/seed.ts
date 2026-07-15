/* eslint-disable no-console */
// Seed script — dictionaries + a full sample org/position/employee/legal-entity/contract.
// Re-runnable: wipes leaf tables first, then re-seeds.
// Uses the trigger service functions so codegen + versioning are exercised.

import { prisma } from "@/lib/prisma";
import { createOrganization } from "@/lib/triggers/orgTriggers";
import { createPosition } from "@/lib/triggers/positionTriggers";
import { createEmployee } from "@/lib/triggers/employeeTriggers";
import { createContract } from "@/lib/triggers/contractTriggers";
import {
  upsertCompensation,
  upsertFamilyMember,
  upsertEmergencyContact,
  upsertCertificate,
} from "@/lib/triggers";
import {
  checkLegalEntityRegisterNumberUnique,
} from "@/lib/prechecks";

// Leaf-first delete order (FK-safe on both SQLite and MySQL).
async function wipe() {
  const tables = [
    prisma.adhrs_code_seq,
    prisma.adhrs_contract_seq,
    prisma.adhrs_legal_entity_contract_relation,
    prisma.adhrs_employee_contract_person_relation,
    prisma.adhrs_hrs_cms_contract_type_realtion,
    prisma.adhrs_hrs_cms_legal_entity_realtion,
    prisma.adhrs_contract,
    prisma.adhrs_employee_work_experience,
    prisma.adhrs_employee_education_background,
    prisma.adhrs_employee_certificate,
    prisma.adhrs_employee_emergency_contact,
    prisma.adhrs_employee_family_member,
    prisma.adhrs_employee_compensation,
    prisma.adhrs_employee_social_security,
    prisma.adhrs_employee_bank_account,
    prisma.adhrs_employee_basic_info,
    prisma.adhrsEmployeeOrgAssignment,
    prisma.adhrsOrganizationVersions,
    prisma.adhrsPositionVersions,
    prisma.adhrsEmployees,
    prisma.adhrsOrganizations,
    prisma.adhrsPositions,
    prisma.adhrs_legal_entity,
    prisma.adhrs_hrs_contract_type,
    prisma.adhrs_system_state,
    prisma.location,
    prisma.id_document_type,
    prisma.legal_entity_register_number_type,
    prisma.currency,
    prisma.bank,
    prisma.country,
  ];
  for (const t of tables) {
    await (t as unknown as { deleteMany: (a?: unknown) => Promise<unknown> }).deleteMany({
      where: {},
    });
  }
}

async function seedDictionaries() {
  const cn = await prisma.country.create({
    data: { country_code: "CN", country_name: "China" },
  });
  const us = await prisma.country.create({
    data: { country_code: "US", country_name: "United States" },
  });

  await prisma.currency.create({ data: { currency_code: "CNY", currency_name: "Chinese Yuan", symbol: "¥" } });
  await prisma.currency.create({ data: { currency_code: "USD", currency_name: "US Dollar", symbol: "$" } });

  await prisma.bank.create({
    data: { bank_code: "ICBC", bank_name: "Industrial and Commercial Bank of China", bank_name_short: "ICBC", country_id: cn.id },
  });
  await prisma.bank.create({
    data: { bank_code: "BOC", bank_name: "Bank of China", bank_name_short: "BOC", country_id: cn.id },
  });

  const idDocType = await prisma.id_document_type.create({ data: { document_type_name: "National ID Card", country_id: cn.id } });
  await prisma.id_document_type.create({ data: { document_type_name: "Passport", country_id: cn.id } });
  await prisma.id_document_type.create({ data: { document_type_name: "Passport", country_id: us.id } });

  const regType = await prisma.legal_entity_register_number_type.create({
    data: { code: "USCC", name: "Unified Social Credit Code", country_id: cn.id },
  });

  // location tree (CN -> Guangdong -> Shenzhen)
  const cnLoc = await prisma.location.create({ data: { code: "CN", name: "China", level: 0, country_id: cn.id } });
  const gd = await prisma.location.create({ data: { code: "GD", name: "Guangdong", level: 1, country_id: cn.id, parentId: cnLoc.id } });
  await prisma.location.create({ data: { code: "SZ", name: "Shenzhen", level: 2, country_id: cn.id, parentId: gd.id } });
  await prisma.location.create({ data: { code: "GZ", name: "Guangzhou", level: 2, country_id: cn.id, parentId: gd.id } });

  return { cn, us, regType, idDocType };
}

async function main() {
  console.log("→ wiping…");
  await wipe();
  console.log("→ seeding dictionaries…");
  const { cn, regType, idDocType } = await seedDictionaries();

  console.log("→ seeding contract types…");
  const ctFull = await prisma.adhrs_hrs_contract_type.create({ data: { code: "FT", name: "Full-time" } });
  await prisma.adhrs_hrs_contract_type.create({ data: { code: "PT", name: "Part-time" } });

  console.log("→ creating organizations (triggers + codegen)…");
  const org1 = await createOrganization({
    name: "Shenzhen Engineering",
    structureType: "Business",
    orgType: "Department",
    prefix: "CNSZ",
    effectiveDate: new Date(),
  });
  const org2 = await createOrganization({
    name: "Guangzhou Sales",
    structureType: "Business",
    orgType: "Department",
    prefix: "CNGZ",
    effectiveDate: new Date(),
  });
  console.log(`   org1 code=${org1.code}  org2 code=${org2.code}`);

  console.log("→ creating positions (triggers + codegen)…");
  const pos1 = await createPosition({
    name: "Senior Engineer",
    orgId: org1.orgId,
    jobLevel: "General Staff",
    effectiveDate: new Date(),
  });
  const pos2 = await createPosition({
    name: "Engineering Manager",
    orgId: org1.orgId,
    jobLevel: "Manager",
    effectiveDate: new Date(),
  });
  console.log(`   pos1 code=${pos1.code}  pos2 code=${pos2.code}`);

  console.log("→ creating a legal entity…");
  await checkLegalEntityRegisterNumberUnique("91440300MA5EXAMPLE");
  const legalEntity = await prisma.adhrs_legal_entity.create({
    data: {
      entity_name: "Example Tech Co., Ltd.",
      register_number: "91440300MA5EXAMPLE",
      register_number_type_id: regType.id,
      country_id: cn.id,
    },
  });

  console.log("→ creating employee (trigger + codegen + person + current version)…");
  const emp = await createEmployee(
    {
      hireDate: new Date(),
      orgId: org1.orgId,
      positionId: pos1.positionId,
      reportToEmployeeId: undefined,
      officeLocation: "Shenzhen",
      employmentType: "Full-time",
      managingPeopleOrNot: false,
      effectiveDate: new Date(),
    },
    {
      name: "Zhang San",
      localLanguageName: "张三",
      gender: "Male",
      email: "zhangsan@example.com",
      mobilePhone: "+86 13800000000",
      idDocumentTypeId: idDocType.id,
      idDocumentNumber: "440300199001010001",
      countryId: cn.id,
      city: "Shenzhen",
      degree: "Bachelor",
    },
  );
  console.log(`   employee code=${emp.code}`);

  console.log("→ seeding employee infotypes (compensation / family / emergency / certificate)…");
  const cny = await prisma.currency.findFirst({ where: { currency_code: "CNY" } });
  await upsertCompensation(emp.employeeId, {
    payType: "Monthly",
    payGrade: "P5",
    payLevel: "L3",
    baseSalary: 25000,
    currencyId: cny?.id,
    effectiveDate: new Date(),
  });
  await upsertFamilyMember(emp.employeeId, {
    name: "Li Si",
    relationship: "Spouse",
    phone: "+86 13900000000",
    isDependent: true,
    cohabiting: true,
  });
  await upsertEmergencyContact(emp.employeeId, {
    name: "Li Si",
    relationship: "Spouse",
    phone: "+86 13900000000",
    isPrimary: true,
  });
  await upsertCertificate(emp.employeeId, {
    type: "Qualification",
    name: "Senior Engineer Certificate",
    number: "SEC-2020-0001",
    issueDate: new Date("2020-06-01"),
    expiryDate: new Date("2030-06-01"),
    issuingAuthority: "MoHR",
  });

  console.log("→ creating a contract (trigger + contract_no + CMS push)…");
  const contract = await createContract({
    contractTypeId: ctFull.id,
    title: "Full-time employment — Zhang San",
    employeeId: emp.employeeId,
    employeeVersionId: emp.versionId,
    legalEntityIds: [legalEntity.id],
    actionType: "New",
    termType: "Fixed-term",
    status: "Active",
    signDate: new Date(),
    effectiveDate: new Date(),
    expireDate: new Date(Date.now() + 365 * 24 * 3600 * 1000),
  });
  console.log(`   contract no=${contract.contractNo}  cmsUuid=${contract.cmsUuid}`);

  console.log("\n✓ seed complete.");
  console.log("   organization codes:", org1.code, org2.code);
  console.log("   position codes:", pos1.code, pos2.code);
  console.log("   employee code:", emp.code);
  console.log("   contract no:", contract.contractNo);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
