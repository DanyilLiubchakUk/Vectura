# Prisma + CockroachDB — scripts

**Requires:** A CockroachDB cluster and `COCKROACH_DATABASE_URL` in `.env.local` (root of the project). Create a Serverless cluster at [cockroachlabs.cloud](https://cockroachlabs.cloud), then copy the connection string into `.env.local`.

---

## Scripts (run from project root)

| Script                  | What it does                                                                                                                                                                                                                                                         |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`npm run db:setup`**  | First-time setup: `prisma generate` + `prisma migrate deploy`. Creates/updates the Prisma client and applies all migrations so the DB has the right tables. Run once per machine (or after clone) when the DB is empty or you want to catch up.                      |
| **`npm run db:test`**   | Checks that the app can connect to CockroachDB (uses `.env.local`). Run after setup to confirm connection.                                                                                                                                                           |
| **`npm run db:deploy`** | Applies **pending migrations** to the database. Use this in CI or on production: it does not create new migrations, it only runs migrations that haven’t been applied yet. Same command for any environment; point it at the right DB with `COCKROACH_DATABASE_URL`. |
| **`npm run db:studio`** | Opens Prisma Studio in the browser so you can browse and edit tables. Uses the DB from `.env.local`.                                                                                                                                                                 |

---

**Flow:** Create cluster → put `COCKROACH_DATABASE_URL` in `.env.local` → `npm run db:setup` → `npm run db:test`. Later, to deploy new migrations (e.g. in prod), run `npm run db:deploy` with that env set.
