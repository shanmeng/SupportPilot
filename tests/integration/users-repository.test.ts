import { sql } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { getDb } from "@/lib/db/client";
import { upsertGitHubUser } from "@/lib/db/users-repository";

const profile = {
  githubId: "1001",
  login: "octo-engineer",
  name: "Octo Engineer",
  email: "octo@example.test",
  avatarUrl: "https://avatars.example.test/1001",
};

describe("upsertGitHubUser (real PostgreSQL)", () => {
  beforeEach(async () => {
    await getDb().execute(sql`truncate table users cascade`);
  });

  it("creates a user with a UUID id and the resolved role", async () => {
    const user = await upsertGitHubUser(profile, "engineer");

    expect(user.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(user).toMatchObject({ login: "octo-engineer", role: "engineer", name: "Octo Engineer" });
  });

  it("keeps the same id on later sign-ins and updates profile and role", async () => {
    const first = await upsertGitHubUser(profile, "engineer");
    const second = await upsertGitHubUser({ ...profile, name: "Renamed" }, "lead");

    expect(second.id).toBe(first.id);
    expect(second).toMatchObject({ name: "Renamed", role: "lead" });
  });

  it("keeps different GitHub accounts as different users", async () => {
    const a = await upsertGitHubUser(profile, "engineer");
    const b = await upsertGitHubUser({ ...profile, githubId: "1002", login: "other" }, "engineer");

    expect(a.id).not.toBe(b.id);
  });
});
