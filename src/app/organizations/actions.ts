"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { toErrorResult } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import {
  createOrganization,
  addOrganizationVersion,
  editOrganizationVersion,
  deleteOrganizationVersion,
  deleteOrganization,
} from "@/lib/triggers";

export type ActionState = { error: string | null };

function optString(fd: FormData, key: string): string | undefined {
  const value = String(fd.get(key) ?? "").trim();
  return value || undefined;
}

function optNumber(fd: FormData, key: string): number | undefined {
  return fd.get(key) ? Number(fd.get(key)) : undefined;
}

export async function createOrganizationAction(
  _prev: ActionState,
  fd: FormData,
): Promise<ActionState> {
  const input = {
    name: String(fd.get("name") ?? "").trim(),
    structureType: (fd.get("structureType") as string) || undefined,
    orgType: (fd.get("orgType") as string) || undefined,
    costCenterCode: optString(fd, "costCenterCode"),
    departmentHeadId: optNumber(fd, "departmentHeadId"),
    parentOrgId: optNumber(fd, "parentOrgId"),
    prefix: (fd.get("prefix") as string) || undefined,
    effectiveDate: fd.get("effectiveDate") ? String(fd.get("effectiveDate")) : new Date(),
  };
  if (!input.name) return { error: "Name is required." };
  if (!input.orgType) return { error: "Org type is required." };
  const activeOrgCount = await prisma.adhrsOrganizations.count({ where: { deletedAt: null } });
  if (activeOrgCount > 0 && !input.parentOrgId) {
    return { error: "Parent organization is required." };
  }
  try {
    await createOrganization(input);
  } catch (e) {
    return { error: toErrorResult(e).message };
  }
  revalidatePath("/organizations");
  redirect("/organizations");
}

export async function addOrgVersionAction(
  _prev: ActionState,
  fd: FormData,
): Promise<ActionState> {
  const orgId = Number(fd.get("orgId"));
  const effectiveDate = fd.get("effectiveDate") ? String(fd.get("effectiveDate")) : "";
  if (!effectiveDate) {
    return { error: "Effective date is required for an organization change." };
  }
  const input = {
    name: String(fd.get("name") ?? "").trim(),
    orgType: (fd.get("orgType") as string) || undefined,
    costCenterCode: optString(fd, "costCenterCode"),
    departmentHeadId: optNumber(fd, "departmentHeadId"),
    parentOrgId: optNumber(fd, "parentOrgId"),
    effectiveDate,
  };
  if (!input.name) return { error: "Name is required." };
  if (!input.orgType) return { error: "Org type is required." };
  const activeOrgCount = await prisma.adhrsOrganizations.count({
    where: { id: { not: orgId }, deletedAt: null },
  });
  if (activeOrgCount > 0 && !input.parentOrgId) {
    return { error: "Parent organization is required." };
  }
  let versionId: number;
  try {
    const result = await addOrganizationVersion(orgId, input);
    versionId = result.versionId;
  } catch (e) {
    const result = toErrorResult(e);
    return {
      error: result.message.includes("Unique constraint failed")
        ? "该生效日期已存在历史版本，请选择其它生效日期。"
        : result.message,
    };
  }
  revalidatePath(`/organizations/${orgId}`);
  redirect(`/organizations/${orgId}?version=${versionId}`);
}

export async function editOrgVersionAction(
  _prev: ActionState,
  fd: FormData,
): Promise<ActionState> {
  const orgId = Number(fd.get("orgId"));
  const versionId = Number(fd.get("versionId"));
  const effectiveDate = fd.get("effectiveDate") ? String(fd.get("effectiveDate")) : "";
  const input = {
    name: String(fd.get("name") ?? "").trim(),
    orgType: (fd.get("orgType") as string) || undefined,
    costCenterCode: optString(fd, "costCenterCode"),
    departmentHeadId: optNumber(fd, "departmentHeadId"),
    parentOrgId: optNumber(fd, "parentOrgId"),
    effectiveDate: effectiveDate || undefined,
  };
  if (!input.name) return { error: "Name is required." };
  if (!input.orgType) return { error: "Org type is required." };
  const activeOrgCount = await prisma.adhrsOrganizations.count({
    where: { id: { not: orgId }, deletedAt: null },
  });
  if (activeOrgCount > 0 && !input.parentOrgId) {
    return { error: "Parent organization is required." };
  }
  try {
    await editOrganizationVersion(versionId, input);
  } catch (e) {
    return { error: toErrorResult(e).message };
  }
  revalidatePath(`/organizations/${orgId}`);
  redirect(`/organizations/${orgId}?version=${versionId}`);
}

export async function deleteOrgVersionAction(
  _prev: ActionState,
  fd: FormData,
): Promise<ActionState> {
  const versionId = Number(fd.get("versionId"));
  let orgId: number | null = null;
  try {
    const result = await deleteOrganizationVersion(versionId);
    orgId = result.orgId;
  } catch (e) {
    return { error: toErrorResult(e).message };
  }
  revalidatePath(orgId ? `/organizations/${orgId}` : "/organizations");
  redirect(orgId ? `/organizations/${orgId}` : "/organizations");
}

export async function deleteOrganizationAction(
  _prev: ActionState,
  fd: FormData,
): Promise<ActionState> {
  const orgId = Number(fd.get("orgId"));
  try {
    await deleteOrganization(orgId);
  } catch (e) {
    return { error: toErrorResult(e).message };
  }
  revalidatePath("/organizations");
  redirect("/organizations");
}
