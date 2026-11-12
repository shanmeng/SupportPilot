import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

/**
 * Integration tests run against a real PostgreSQL + pgvector database
 * (Docker locally, a service container in CI). Migrations are applied once per run.
 */
export default async function setup() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "Integration tests need DATABASE_URL pointing at a disposable PostgreSQL + pgvector database (see README: Testing).",
    );
  }
  const client = postgres(url, { max: 1, onnotice: () => {} });
  try {
    await migrate(drizzle(client), { migrationsFolder: "./drizzle" });
  } finally {
    await client.end();
  }
}
