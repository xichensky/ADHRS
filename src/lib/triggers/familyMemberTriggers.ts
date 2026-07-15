// Family member / social relation trigger. Current-state record (no
// effective-dating): create/update + soft-delete.

import { NotFoundError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { toMidnightUtc } from "@/lib/datetime";
import { validateEnum } from "@/lib/validation";
import { FAMILY_RELATIONSHIPS, GENDERS } from "@/lib/types";

export interface FamilyMemberInput {
  name: string;
  relationship?: string;
  gender?: string;
  birthDate?: Date | string;
  idDocumentTypeId?: number;
  idDocumentNumber?: string;
  isDependent?: boolean;
  cohabiting?: boolean;
  employer?: string;
  phone?: string;
}

function data(i: FamilyMemberInput) {
  return {
    name: i.name,
    relationship: i.relationship ?? null,
    gender: i.gender ?? null,
    birth_date: i.birthDate ? toMidnightUtc(i.birthDate) : null,
    id_document_type_id: i.idDocumentTypeId ?? null,
    id_document_number: i.idDocumentNumber ? i.idDocumentNumber.trim().toUpperCase() : null,
    is_dependent: i.isDependent ?? false,
    cohabiting: i.cohabiting ?? false,
    employer: i.employer ?? null,
    phone: i.phone ?? null,
  };
}

export async function upsertFamilyMember(
  employeeId: number,
  input: FamilyMemberInput,
  id?: number,
): Promise<{ familyMemberId: number }> {
  validateEnum("Family relationship", input.relationship, FAMILY_RELATIONSHIPS);
  validateEnum("Gender", input.gender, GENDERS);
  if (id) {
    const existing = await prisma.adhrs_employee_family_member.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError("Family Member", id);
    const row = await prisma.adhrs_employee_family_member.update({ where: { id }, data: data(input) });
    return { familyMemberId: row.id };
  }
  const row = await prisma.adhrs_employee_family_member.create({
    data: { employee_id: employeeId, ...data(input) },
  });
  return { familyMemberId: row.id };
}

export async function deleteFamilyMember(id: number): Promise<void> {
  const row = await prisma.adhrs_employee_family_member.findUnique({ where: { id } });
  if (!row) throw new NotFoundError("Family Member", id);
  await prisma.adhrs_employee_family_member.update({ where: { id }, data: { deletedAt: new Date() } });
}
