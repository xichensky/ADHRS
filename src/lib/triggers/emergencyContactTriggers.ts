// Emergency contact trigger. Current-state, multi-row: create/update + soft-delete.

import { NotFoundError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";

export interface EmergencyContactInput {
  name: string;
  relationship?: string;
  phone?: string;
  email?: string;
  isPrimary?: boolean;
}

function data(i: EmergencyContactInput) {
  return {
    name: i.name,
    relationship: i.relationship ?? null,
    phone: i.phone ?? null,
    email: i.email ? i.email.trim().toLowerCase() : null,
    is_primary: i.isPrimary ?? false,
  };
}

export async function upsertEmergencyContact(
  employeeId: number,
  input: EmergencyContactInput,
  id?: number,
): Promise<{ emergencyContactId: number }> {
  if (id) {
    const existing = await prisma.adhrs_employee_emergency_contact.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError("Emergency Contact", id);
    const row = await prisma.adhrs_employee_emergency_contact.update({ where: { id }, data: data(input) });
    return { emergencyContactId: row.id };
  }
  const row = await prisma.adhrs_employee_emergency_contact.create({
    data: { employee_id: employeeId, ...data(input) },
  });
  return { emergencyContactId: row.id };
}

export async function deleteEmergencyContact(id: number): Promise<void> {
  const row = await prisma.adhrs_employee_emergency_contact.findUnique({ where: { id } });
  if (!row) throw new NotFoundError("Emergency Contact", id);
  await prisma.adhrs_employee_emergency_contact.update({ where: { id }, data: { deletedAt: new Date() } });
}
