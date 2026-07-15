import { PrismaClient } from "@prisma/client";

// A client usable both standalone (the global `prisma`) and inside a
// `$transaction(tx => ...)` callback. PrismaClient is assignable to this type,
// and so is the transaction client.
export type TxClient = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

// Prisma singleton — avoids exhausting DB connections during Next.js hot-reload.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
