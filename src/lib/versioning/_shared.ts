// Shared helpers for the versioning module.

import { toMidnightUtc } from "@/lib/datetime";
import { prisma, type TxClient } from "@/lib/prisma";

/**
 * Pick the current item = the latest one whose effectiveDate <= now AND that
 * has not expired (expirationDate null or >= now). Expired versions with no
 * newer replacement no longer stay current.
 */
export function pickByEffectiveDate<T>(
  items: T[],
  getDate: (t: T) => Date,
  getExpiration: (t: T) => Date | null,
  now: Date = new Date(),
): T | null {
  const nowMs = toMidnightUtc(now).getTime();
  const eligible = items.filter((t) => {
    if (getDate(t).getTime() > nowMs) return false; // not yet effective
    const exp = getExpiration(t);
    return exp == null || exp.getTime() >= nowMs; // not expired
  });
  if (eligible.length === 0) return null;
  return eligible.reduce((best, cur) =>
    getDate(cur).getTime() > getDate(best).getTime() ? cur : best,
  );
}

/** Run `fn` inside the caller's transaction, or a fresh one if none was given. */
export async function withTx<T>(
  tx: TxClient | undefined,
  fn: (tx: TxClient) => Promise<T>,
): Promise<T> {
  return tx ? fn(tx) : prisma.$transaction(fn);
}
