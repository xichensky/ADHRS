"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { toErrorResult } from "@/lib/errors";
import { prisma } from "@/lib/prisma";

export type ActionState = { error: string | null };

export async function createContractTypeAction(
  _prev: ActionState,
  fd: FormData,
): Promise<ActionState> {
  const code = String(fd.get("code") ?? "").trim();
  const name = String(fd.get("name") ?? "").trim();
  if (!code || !name) return { error: "Code and name are required." };
  try {
    await prisma.adhrs_hrs_contract_type.create({ data: { code: code.toUpperCase(), name } });
  } catch (e) {
    return { error: toErrorResult(e).message };
  }
  revalidatePath("/contract-types");
  redirect("/contract-types");
}
