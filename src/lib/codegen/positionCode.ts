import type { TxClient } from "@/lib/prisma";
import { generateUniqueCode } from "./generate";

const JOB_LEVEL_PREFIX: Record<string, string> = {
  "General Staff": "GS",
  Intern: "IN",
  Leader: "LD",
  Manager: "MG",
  "Upper Management": "UM",
};

/** Fn: generatePositionCode — job-level prefix + zero-padded increment. */
export async function generatePositionCode(
  jobLevel: string,
  tx?: TxClient,
): Promise<string> {
  return generateUniqueCode({
    prefix: JOB_LEVEL_PREFIX[jobLevel] ?? "POS",
    codeType: "positionCode",
    tx,
  });
}
