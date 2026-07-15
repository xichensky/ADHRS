// Certificate / license trigger. Event record with issue/expiry: create/update
// + soft-delete.

import { NotFoundError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { toMidnightUtc } from "@/lib/datetime";
import { validateEnum } from "@/lib/validation";
import { CERTIFICATE_TYPES } from "@/lib/types";

export interface CertificateInput {
  type?: string;
  name?: string;
  number?: string;
  issueDate?: Date | string;
  expiryDate?: Date | string;
  issuingAuthority?: string;
  countryId?: number;
  attachment?: unknown;
}

function data(i: CertificateInput) {
  return {
    type: i.type ?? null,
    name: i.name ?? null,
    number: i.number ?? null,
    issue_date: i.issueDate ? toMidnightUtc(i.issueDate) : null,
    expiry_date: i.expiryDate ? toMidnightUtc(i.expiryDate) : null,
    issuing_authority: i.issuingAuthority ?? null,
    country_id: i.countryId ?? null,
    attachment: i.attachment ? (i.attachment as never) : undefined,
  };
}

export async function upsertCertificate(
  employeeId: number,
  input: CertificateInput,
  id?: number,
): Promise<{ certificateId: number }> {
  validateEnum("Certificate type", input.type, CERTIFICATE_TYPES);
  const d = data(input);
  if (id) {
    const existing = await prisma.adhrs_employee_certificate.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError("Certificate", id);
    const row = await prisma.adhrs_employee_certificate.update({ where: { id }, data: d });
    return { certificateId: row.id };
  }
  const row = await prisma.adhrs_employee_certificate.create({
    data: { employee_id: employeeId, ...d },
  });
  return { certificateId: row.id };
}

export async function deleteCertificate(id: number): Promise<void> {
  const row = await prisma.adhrs_employee_certificate.findUnique({ where: { id } });
  if (!row) throw new NotFoundError("Certificate", id);
  await prisma.adhrs_employee_certificate.update({ where: { id }, data: { deletedAt: new Date() } });
}
