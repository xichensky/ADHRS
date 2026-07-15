// Code-generation sequence counter over `adhrs_code_seq`.
//
// Previously this used a JSON KV blob in adhrs_system_state (read-modify-write,
// which raced under concurrency and lost updates). It now uses a dedicated
// (codeType, prefix) -> lastSeq table incremented atomically via SQL, which is
// race-free on both SQLite and MySQL.

import { prisma, type TxClient } from "@/lib/prisma";

export type CodeType = "orgCode" | "employeeCode" | "positionCode";

/**
 * Atomically reserve and return the next sequence number for a (codeType,
 * prefix). Relies on Prisma upsert + { increment: 1 }, which compiles to a
 * single INSERT ... ON CONFLICT DO UPDATE SET lastSeq = lastSeq + 1 — atomic
 * under row-level locking, so two concurrent requests always get distinct seqs.
 */
export async function nextCodeSeq(
  codeType: CodeType,
  prefix: string,
  tx: TxClient = prisma,
): Promise<number> {
  const row = await tx.adhrs_code_seq.upsert({
    where: { codeType_prefix: { codeType, prefix } },
    create: { codeType, prefix, lastSeq: 1 },
    update: { lastSeq: { increment: 1 } },
  });
  return row.lastSeq;
}
