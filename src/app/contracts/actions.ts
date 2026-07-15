"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { toErrorResult } from "@/lib/errors";
import { createContract, deleteContract } from "@/lib/triggers";

export type ActionState = { error: string | null };

export async function createContractAction(
  _prev: ActionState,
  fd: FormData,
): Promise<ActionState> {
  const contractTypeId = Number(fd.get("contractTypeId"));
  if (!contractTypeId) return { error: "Contract type is required." };

  const legalEntityIds = fd.getAll("legalEntityIds").map(Number).filter(Boolean);

  try {
    await createContract({
      contractTypeId,
      title: (fd.get("title") as string) || undefined,
      employeeId: fd.get("employeeId") ? Number(fd.get("employeeId")) : undefined,
      employeeVersionId: fd.get("employeeVersionId") ? Number(fd.get("employeeVersionId")) : undefined,
      legalEntityIds,
      actionType: (fd.get("actionType") as string) || undefined,
      termType: (fd.get("termType") as string) || undefined,
      status: (fd.get("status") as string) || undefined,
      signDate: (fd.get("signDate") as string) || undefined,
      effectiveDate: (fd.get("effectiveDate") as string) || undefined,
      expireDate: (fd.get("expireDate") as string) || undefined,
      terminateDate: (fd.get("terminateDate") as string) || undefined,
    });
  } catch (e) {
    return { error: toErrorResult(e).message };
  }
  revalidatePath("/contracts");
  redirect("/contracts");
}

export async function deleteContractAction(
  _prev: ActionState,
  fd: FormData,
): Promise<ActionState> {
  const contractId = Number(fd.get("contractId"));
  try {
    await deleteContract(contractId);
  } catch (e) {
    return { error: toErrorResult(e).message };
  }
  revalidatePath("/contracts");
  redirect("/contracts");
}
