"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { toErrorResult } from "@/lib/errors";
import {
  createPosition,
  addPositionVersion,
  editPositionVersion,
  deletePositionVersion,
  deletePosition,
} from "@/lib/triggers";

export type ActionState = { error: string | null };

export async function createPositionAction(
  _prev: ActionState,
  fd: FormData,
): Promise<ActionState> {
  const input = {
    name: String(fd.get("name") ?? "").trim(),
    jobLevel: (fd.get("jobLevel") as string) || undefined,
    orgId: fd.get("orgId") ? Number(fd.get("orgId")) : undefined,
    effectiveDate: fd.get("effectiveDate") ? String(fd.get("effectiveDate")) : new Date(),
    expirationDate: (fd.get("expirationDate") as string) || undefined,
  };
  if (!input.name) return { error: "Name is required." };
  if (!input.jobLevel) return { error: "Job level is required." };
  if (!input.orgId) return { error: "Organization is required." };
  try {
    await createPosition(input);
  } catch (e) {
    return { error: toErrorResult(e).message };
  }
  revalidatePath("/positions");
  redirect("/positions");
}

export async function addPositionVersionAction(
  _prev: ActionState,
  fd: FormData,
): Promise<ActionState> {
  const positionId = Number(fd.get("positionId"));
  const input = {
    name: String(fd.get("name") ?? "").trim(),
    jobLevel: (fd.get("jobLevel") as string) || undefined,
    orgId: fd.get("orgId") ? Number(fd.get("orgId")) : undefined,
    effectiveDate: fd.get("effectiveDate") ? String(fd.get("effectiveDate")) : new Date(),
    expirationDate: (fd.get("expirationDate") as string) || undefined,
  };
  if (!input.name) return { error: "Name is required." };
  if (!input.jobLevel) return { error: "Job level is required." };
  if (!input.orgId) return { error: "Organization is required." };
  try {
    await addPositionVersion(positionId, input);
  } catch (e) {
    return { error: toErrorResult(e).message };
  }
  revalidatePath(`/positions/${positionId}`);
  redirect(`/positions/${positionId}`);
}

export async function editPositionVersionAction(
  _prev: ActionState,
  fd: FormData,
): Promise<ActionState> {
  const positionId = Number(fd.get("positionId"));
  const versionId = Number(fd.get("versionId"));
  const input = {
    name: String(fd.get("name") ?? "").trim(),
    jobLevel: (fd.get("jobLevel") as string) || undefined,
    orgId: fd.get("orgId") ? Number(fd.get("orgId")) : undefined,
    effectiveDate: fd.get("effectiveDate") ? String(fd.get("effectiveDate")) : undefined,
  };
  if (!input.name) return { error: "Name is required." };
  if (!input.jobLevel) return { error: "Job level is required." };
  if (!input.orgId) return { error: "Organization is required." };
  try {
    await editPositionVersion(versionId, input);
  } catch (e) {
    return { error: toErrorResult(e).message };
  }
  revalidatePath(`/positions/${positionId}`);
  redirect(`/positions/${positionId}?version=${versionId}`);
}

export async function deletePositionVersionAction(
  _prev: ActionState,
  fd: FormData,
): Promise<ActionState> {
  const versionId = Number(fd.get("versionId"));
  let positionId: number | null = null;
  try {
    const result = await deletePositionVersion(versionId);
    positionId = result.positionId;
  } catch (e) {
    return { error: toErrorResult(e).message };
  }
  revalidatePath(positionId ? `/positions/${positionId}` : "/positions");
  redirect(positionId ? `/positions/${positionId}` : "/positions");
}

export async function deletePositionAction(
  _prev: ActionState,
  fd: FormData,
): Promise<ActionState> {
  const positionId = Number(fd.get("positionId"));
  try {
    await deletePosition(positionId);
  } catch (e) {
    return { error: toErrorResult(e).message };
  }
  revalidatePath("/positions");
  redirect("/positions");
}
