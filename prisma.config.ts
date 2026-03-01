import { config } from "dotenv";
import { defineConfig, env } from "prisma/config";

config({ path: ".env.local" });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: { url: env("COCKROACH_DATABASE_URL") },
  experimental: { externalTables: true },
  enums: { external: ["public.crdb_internal_region"] },
});
