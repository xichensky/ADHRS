"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { toErrorResult } from "@/lib/errors";
import { DICT_CONFIG, resolveModel, type DictSlug } from "./config";

/** Create a dictionary row. `slug` is passed via the __dict form field. */
export async function createDictEntry(
  _prev: { error: string | null },
  formData: FormData,
): Promise<{ error: string | null }> {
  const slug = formData.get("__dict") as DictSlug;
  const cfg = DICT_CONFIG[slug];
  if (!cfg) return { error: "Unknown dictionary." };

  const data: Record<string, unknown> = {};
  for (const f of cfg.fields) {
    const raw = (formData.get(f.name) as string | null)?.trim() ?? "";
    if (f.kind === "country") {
      data[f.name] = raw ? Number(raw) : null;
    } else if (f.required && !raw) {
      return { error: `${f.label} is required.` };
    } else {
      data[f.name] = raw || null;
    }
  }
  try {
    await resolveModel(slug).create({ data });
  } catch (e) {
    return { error: toErrorResult(e).message };
  }
  revalidatePath(`/dictionaries/${slug}`);
  redirect(`/dictionaries/${slug}`);
}
