"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { toErrorResult } from "@/lib/errors";
import { prisma } from "@/lib/prisma";

export type ActionState = { error: string | null };

export async function createLocationAction(
  _prev: ActionState,
  fd: FormData,
): Promise<ActionState> {
  const code = String(fd.get("code") ?? "").trim();
  const name = String(fd.get("name") ?? "").trim();
  if (!code || !name) return { error: "Code and name are required." };
  const level = Number(fd.get("level") ?? 0);
  const country_id = fd.get("country_id") ? Number(fd.get("country_id")) : null;
  const parentId = fd.get("parentId") ? Number(fd.get("parentId")) : null;
  try {
    await prisma.location.create({ data: { code, name, level, country_id, parentId } });
  } catch (e) {
    return { error: toErrorResult(e).message };
  }
  revalidatePath("/dictionaries/locations");
  redirect("/dictionaries/locations");
}
