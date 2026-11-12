import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { getServerEnv } from "@/lib/env";
import * as schema from "./schema";

type Database = ReturnType<typeof drizzle<typeof schema>>;

let db: Database | undefined;

/** Lazily creates one pooled PostgreSQL client per server process. */
export function getDb(): Database {
  if (!db) {
    const client = postgres(getServerEnv().DATABASE_URL, { max: 5, prepare: false });
    db = drizzle(client, { schema });
  }
  return db;
}
