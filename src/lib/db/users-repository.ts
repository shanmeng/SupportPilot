import "server-only";
import type { Role } from "@/lib/auth/roles";
import { getDb } from "./client";
import { users, type UserRow } from "./schema";

export type GitHubProfile = {
  githubId: string;
  login: string;
  name: string | null;
  email: string | null;
  avatarUrl: string | null;
};

/** Creates the user on first sign-in, or refreshes profile and role on later sign-ins. */
export async function upsertGitHubUser(profile: GitHubProfile, role: Role): Promise<UserRow> {
  const values = { ...profile, role, updatedAt: new Date() };
  const [row] = await getDb()
    .insert(users)
    .values(values)
    .onConflictDoUpdate({ target: users.githubId, set: values })
    .returning();
  if (!row) throw new Error("User upsert returned no row");
  return row;
}
