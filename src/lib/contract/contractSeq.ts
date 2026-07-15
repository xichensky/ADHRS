// Fn (part of generateContractVariables): atomically reserve the next sequence
// number for a (contract type, day). Collapses the report's separate "query seq
// then upsert seq" steps into one atomic upsert to avoid races.

import { prisma, type TxClient } from "@/lib/prisma";
import { toMidnightUtc } from "@/lib/datetime";

export async function nextContractSeq(
  contractTypeId: number,
  date: Date | string = new Date(),
  tx: TxClient = prisma,
): Promise<number> {
  const seq_date = toMidnightUtc(date);
  const row = await tx.adhrs_contract_seq.upsert({
    where: { contract_type_id_seq_date: { contract_type_id: contractTypeId, seq_date } },
    create: { contract_type_id: contractTypeId, seq_date, current_seq: 1 },
    update: { current_seq: { increment: 1 } },
  });
  return row.current_seq;
}
