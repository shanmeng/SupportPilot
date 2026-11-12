import "server-only";
import { sql } from "drizzle-orm";
import type { HealthProbes } from "@/lib/health";
import { getDb } from "./client";

export const databaseHealthProbes: HealthProbes = {
  async pingDatabase() {
    await getDb().execute(sql`select 1`);
  },
  async hasVectorExtension() {
    const rows = await getDb().execute(
      sql`select 1 from pg_extension where extname = 'vector'`,
    );
    return rows.length > 0;
  },
};
