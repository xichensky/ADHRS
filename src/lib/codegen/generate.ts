// Shared code-generation entrypoint. Reserves an atomic sequence number from
// `adhrs_code_seq` and builds a zero-padded code (PREFIX + seq). No dedup loop
// is needed — the sequence is monotonic and atomic; the master table's
// @@unique([code]) is the final guard.

import { prisma, type TxClient } from "@/lib/prisma";
import { buildCode } from "./prefix";
import { nextCodeSeq, type CodeType } from "./systemState";

export async function generateUniqueCode(args: {
  prefix: string;
  codeType: CodeType;
  tx?: TxClient;
}): Promise<string> {
  const tx = args.tx ?? prisma;
  const prefix = args.prefix.toUpperCase();
  const seq = await nextCodeSeq(args.codeType, prefix, tx);
  return buildCode(prefix, seq);
}
