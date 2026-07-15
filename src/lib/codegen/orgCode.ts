import type { TxClient } from "@/lib/prisma";
import { generateUniqueCode } from "./generate";

/**
 * Fn: generateOrganizationCode — prefix (derived by the caller from the
 * org's office/location, or the parent org prefix) + zero-padded increment,
 * deduped against `adhrsOrganizations`.
 */
export async function generateOrganizationCode(
  prefix: string,
  tx?: TxClient,
): Promise<string> {
  return generateUniqueCode({ prefix, codeType: "orgCode", tx });
}
