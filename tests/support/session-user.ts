import { sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";

/** Route tests mock the session; saved investigations need the matching users row (created at sign-in in the app). */
export async function ensureUserRow(id: string, role: "engineer" | "lead" = "engineer") {
  await getDb().execute(sql`
    insert into users (id, github_id, login, name, role)
    values (${id}, ${`test:${id}`}, ${`user-${id.slice(0, 8)}`}, 'Octo', ${role})
    on conflict (id) do nothing`);
}
