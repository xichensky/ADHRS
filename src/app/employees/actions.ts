"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { toErrorResult } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import {
  createEmployee,
  addOrgAssignment,
  deleteOrgAssignment,
} from "@/lib/triggers";

export type ActionState = { error: string | null };

function optNum(fd: FormData, key: string): number | undefined {
  const v = fd.get(key);
  return v ? Number(v) : undefined;
}
function optStr(fd: FormData, key: string): string | undefined {
  const v = fd.get(key) as string | null;
  return v && v.trim() ? v.trim() : undefined;
}

export async function createEmployeeAction(
  _prev: ActionState,
  fd: FormData,
): Promise<ActionState> {
  const name = String(fd.get("name") ?? "").trim();
  if (!name) return { error: "Employee name is required." };
  if (!fd.get("hireDate")) return { error: "Hire date is required." };

  try {
    await createEmployee(
      {
        hireDate: String(fd.get("hireDate")),
        orgId: optNum(fd, "orgId"),
        positionId: optNum(fd, "positionId"),
        reportToEmployeeId: optNum(fd, "reportToEmployeeId"),
        officeLocation: optStr(fd, "officeLocation"),
        workLocation: optStr(fd, "workLocation"),
        employmentType: optStr(fd, "employmentType"),
        managingPeopleOrNot: fd.get("managingPeopleOrNot") === "on",
        effectiveDate: String(fd.get("effectiveDate")),
        expirationDate: optStr(fd, "expirationDate"),
      },
      {
        name,
        localLanguageName: optStr(fd, "localLanguageName"),
        gender: optStr(fd, "gender"),
        birthDate: optStr(fd, "birthDate"),
        email: optStr(fd, "email"),
        mobilePhone: optStr(fd, "mobilePhone"),
        homeTel: optStr(fd, "homeTel"),
        idDocumentTypeId: optNum(fd, "idDocumentTypeId"),
        idDocumentNumber: optStr(fd, "idDocumentNumber"),
        idDocumentAddress: optStr(fd, "idDocumentAddress"),
        countryId: optNum(fd, "countryId"),
        province: optStr(fd, "province"),
        city: optStr(fd, "city"),
        district: optStr(fd, "district"),
        homeAddressDetails: optStr(fd, "homeAddressDetails"),
        mailingAddress: optStr(fd, "mailingAddress"),
        hukouLocation: optStr(fd, "hukouLocation"),
        placeOfBirth: optStr(fd, "placeOfBirth"),
        maritalStatus: optStr(fd, "maritalStatus"),
        healthStatus: optStr(fd, "healthStatus"),
        degree: optStr(fd, "degree"),
        emergencyContactName: optStr(fd, "emergencyContactName"),
        emergencyContactPhone: optStr(fd, "emergencyContactPhone"),
        emergencyContactRelationship: optStr(fd, "emergencyContactRelationship"),
      },
    );
  } catch (e) {
    return { error: toErrorResult(e).message };
  }
  revalidatePath("/employees");
  redirect("/employees");
}

export async function addOrgAssignmentAction(
  _prev: ActionState,
  fd: FormData,
): Promise<ActionState> {
  const employeeId = Number(fd.get("employeeId"));
  try {
    await addOrgAssignment(employeeId, {
      eventType: optStr(fd, "eventType"),
      eventReason: optStr(fd, "eventReason"),
      orgId: optNum(fd, "orgId"),
      positionId: optNum(fd, "positionId"),
      secondaryPositionId: optNum(fd, "secondaryPositionId"),
      reportToEmployeeId: optNum(fd, "reportToEmployeeId"),
      employmentType: optStr(fd, "employmentType"),
      officeLocation: optStr(fd, "officeLocation"),
      workLocation: optStr(fd, "workLocation"),
      effectiveDate: String(fd.get("effectiveDate")),
      expirationDate: optStr(fd, "expirationDate"),
    });
  } catch (e) {
    return { error: toErrorResult(e).message };
  }
  revalidatePath(`/employees/${employeeId}`);
  redirect(`/employees/${employeeId}`);
}

export async function deleteOrgAssignmentAction(
  _prev: ActionState,
  fd: FormData,
): Promise<ActionState> {
  const versionId = Number(fd.get("versionId"));
  const v = await prisma.adhrsEmployeeOrgAssignment.findUnique({ where: { id: versionId } });
  try {
    await deleteOrgAssignment(versionId);
  } catch (e) {
    return { error: toErrorResult(e).message };
  }
  revalidatePath(v ? `/employees/${v.employeeId}` : "/employees");
  redirect(v ? `/employees/${v.employeeId}` : "/employees");
}
