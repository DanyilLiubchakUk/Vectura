/**
 * Test CockroachDB connection. Run: npm run db:test
 * Uses CLI-safe Prisma client (src/lib/db-cli.ts).
 */
(async () => {
  const { prisma } = await import("../src/lib/db-cli");
  await prisma.$queryRaw`SELECT 1`;
  console.log("CockroachDB connection OK");
  await prisma.$disconnect();
  process.exit(0);
})().catch((e) => {
  console.error("Connection failed:", e);
  process.exit(1);
});
