import "server-only";

/**
 * Shared Prisma client for CockroachDB (dev + prod).
 * Uses COCKROACH_DATABASE_URL. In production, set this in your environment.
 *
 * This module cannot be run under plain Node/tsx — "server-only" throws outside
 * Next.js. For CLI scripts and workers, use db-cli.ts instead.
 */
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const url = process.env.COCKROACH_DATABASE_URL;
if (!url) {
  throw new Error("COCKROACH_DATABASE_URL is not set");
}

const adapter = new PrismaPg({ connectionString: url });

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
