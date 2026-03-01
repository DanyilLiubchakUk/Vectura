/**
 * Test CockroachDB connection. Run: npm run db:test
 * Uses same client as app (src/lib/db.ts).
 */
(async () => {
  const { prisma } = await import("../src/lib/db");
  await prisma.$queryRaw`SELECT 1`;
  console.log("CockroachDB connection OK");
  await prisma.$disconnect();
  process.exit(0);
})().catch((e) => {
  console.error("Connection failed:", e);
  process.exit(1);
});
