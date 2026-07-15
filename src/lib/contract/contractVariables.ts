// Fn: generateContractVariables — build the contract number + derived identity
// from the contract type and the reserved daily sequence.
//
// contract_no format: {TYPECODE}-{YYYYMMDD}-{NNN}  e.g.  FT-20260710-001

import { NotFoundError } from "@/lib/errors";
import { prisma, type TxClient } from "@/lib/prisma";
import { nextContractSeq } from "./contractSeq";

export interface ContractVariables {
  contractNo: string;
  seq: number;
  seqDate: Date;
  typeCode: string;
}

export async function generateContractVariables(
  contractTypeId: number,
  date: Date | string = new Date(),
  tx?: TxClient,
): Promise<ContractVariables> {
  const db = tx ?? prisma;
  const type = await db.adhrs_hrs_contract_type.findUnique({ where: { id: contractTypeId } });
  if (!type) throw new NotFoundError("Contract Type", contractTypeId);

  const seqDate = date instanceof Date ? date : new Date(date);
  const seq = await nextContractSeq(contractTypeId, seqDate, db);

  const yyyymmdd = seqDate.toISOString().slice(0, 10).replace(/-/g, "");
  const contractNo = `${type.code.toUpperCase()}-${yyyymmdd}-${String(seq).padStart(3, "0")}`;

  return { contractNo, seq, seqDate, typeCode: type.code };
}
