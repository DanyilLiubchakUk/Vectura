/**
 * Prisma client for CLI and background Node scripts (e.g. npm run db:test,
 * agent:alpaca:test, Trigger.dev workers).
 *
 * We have this file because db.ts imports "server-only" and therefore cannot
 * be run under plain Node/tsx — it throws. Use db-cli for any script or worker
 * that runs outside the Next.js server.
 */
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const url = process.env.COCKROACH_DATABASE_URL;
if (!url) {
  throw new Error("COCKROACH_DATABASE_URL is not set");
}

const adapter = new PrismaPg({ connectionString: url });

export const prisma = new PrismaClient({ adapter });
