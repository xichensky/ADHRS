"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { toErrorResult } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { checkLegalEntityRegisterNumberUnique } from "@/lib/prechecks";

export type ActionState = { error: string | null };

export async function createLegalEntityAction(
  _prev: ActionState,
  fd: FormData,
): Promise<ActionState> {
  const entity_name = String(fd.get("entity_name") ?? "").trim();
  const register_number = String(fd.get("register_number") ?? "").trim();
  if (!entity_name || !register_number) return { error: "Entity name and register number are required." };
  const register_number_type_id = fd.get("register_number_type_id") ? Number(fd.get("register_number_type_id")) : null;
  const country_id = fd.get("country_id") ? Number(fd.get("country_id")) : null;
  try {
    await checkLegalEntityRegisterNumberUnique(register_number);
    await prisma.adhrs_legal_entity.create({
      data: { entity_name, register_number, register_number_type_id, country_id },
    });
  } catch (e) {
    return { error: toErrorResult(e).message };
  }
  revalidatePath("/legal-entities");
  redirect("/legal-entities");
}
