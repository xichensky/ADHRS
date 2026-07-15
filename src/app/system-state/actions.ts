"use server";

import { revalidatePath } from "next/cache";
import { toErrorResult } from "@/lib/errors";
import { runDailyVersionSwitch } from "@/lib/scheduler";

export type SwitchState = {
  error: string | null;
  result: { day: string; employee: number; organization: number; position: number; socialSecurity: number; bankAccount: number } | null;
};

export async function runDailySwitchAction(_prev: SwitchState, _fd: FormData): Promise<SwitchState> {
  try {
    const result = await runDailyVersionSwitch();
    revalidatePath("/system-state");
    return { error: null, result };
  } catch (e) {
    return { error: toErrorResult(e).message, result: null };
  }
}
