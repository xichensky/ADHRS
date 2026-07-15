import type { TxClient } from "@/lib/prisma";
import { generateUniqueCode } from "./generate";

/**
 * Fn: generateEmployeeCode — org-code prefix (e.g. "CNSZ") + zero-padded
 * increment, deduped against `adhrsEmployees`.
 */
export async function generateEmployeeCode(
  orgCodePrefix: string,
  tx?: TxClient,
): Promise<string> {
  return generateUniqueCode({ prefix: orgCodePrefix || "EMP", codeType: "employeeCode", tx });
}
