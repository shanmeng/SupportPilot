import { sql } from "drizzle-orm";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { SessionUser } from "@/lib/auth/authorization";

const authMock = vi.hoisted(() => vi.fn());
vi.mock("@/auth", () => ({ auth: authMock }));
vi.mock("@/lib/llm/responses-client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/llm/responses-client")>()),
  getChatModel: () => null,
}));

import { POST as postAnswer } from "@/app/api/v1/answers/route";
import { GET as getOne } from "@/app/api/v1/investigations/[id]/route";
import { GET as list } from "@/app/api/v1/investigations/route";
import { getDb } from "@/lib/db/client";
import { saveInvestigation } from "@/lib/db/investigations-repository";
import { upsertGitHubUser } from "@/lib/db/users-repository";
import { getInvestigationForUser, listInvestigationsForUser } from "@/lib/investigations/service";

let alice: SessionUser;
let bob: SessionUser;
let lead: SessionUser;

const citation = { id: "KB-FIX-001", title: "Webhook Delivery Retries", excerpt: "Retries stop.", kind: "document" as const };

function sessionFor(user: SessionUser) {
  return { user, expires: "2099-01-01T00:00:00.000Z" };
}

async function save(ownerId: string, question: string) {
  return saveInvestigation(ownerId, {
    question,
    scope: null,
    mode: "agent",
    stopReason: "answered",
    answer: `Answer to ${question} [KB-FIX-001]`,
    citations: [citation],
    steps: [{ tool: "searchDocuments", label: "Searched documentation", outcome: "ok" }],
  });
}

function asUser(user: SessionUser | null) {
  authMock.mockResolvedValue(user ? sessionFor(user) : null);
}

const getById = (id: string) => getOne(new Request(`http://localhost/api/v1/investigations/${id}`), { params: Promise.resolve({ id }) });

beforeAll(async () => {
  await getDb().execute(sql`truncate table users cascade`);
  const toUser = (row: { id: string; name: string | null; role: "engineer" | "lead" }): SessionUser => ({
    id: row.id, name: row.name, email: null, image: null, role: row.role,
  });
  alice = toUser(await upsertGitHubUser({ githubId: "9001", login: "alice", name: "Alice", email: null, avatarUrl: null }, "engineer"));
  bob = toUser(await upsertGitHubUser({ githubId: "9002", login: "bob", name: "Bob", email: null, avatarUrl: null }, "engineer"));
  lead = toUser(await upsertGitHubUser({ githubId: "9003", login: "lena", name: "Lena Lead", email: null, avatarUrl: null }, "lead"));
});

beforeEach(async () => {
  await getDb().execute(sql`truncate table investigations`);
  authMock.mockReset();
});

describe("investigation access (real PostgreSQL)", () => {
  it("returns the saved question, status, answer, evidence and steps to the owner", async () => {
    const { id } = await save(alice.id, "Why no webhook?");

    const found = await getInvestigationForUser(alice, id);

    expect(found).toMatchObject({
      id,
      ownerId: alice.id,
      ownerName: "Alice",
      question: "Why no webhook?",
      stopReason: "answered",
      answer: "Answer to Why no webhook? [KB-FIX-001]",
      citations: [citation],
      steps: [{ label: "Searched documentation", outcome: "ok" }],
    });
  });

  it("rejects another engineer reading the investigation", async () => {
    const { id } = await save(alice.id, "Alice's case");

    await expect(getInvestigationForUser(bob, id)).resolves.toBeNull();
  });

  it("lets a lead read any engineer's investigation", async () => {
    const { id } = await save(alice.id, "Alice's case");

    await expect(getInvestigationForUser(lead, id)).resolves.toMatchObject({ id, ownerName: "Alice" });
  });

  it("lists only an engineer's own investigations, newest first", async () => {
    await save(alice.id, "first");
    await save(bob.id, "bob's");
    await save(alice.id, "second");

    const { items } = await listInvestigationsForUser(alice, { limit: 10 });

    expect(items.map((i) => i.question)).toEqual(["second", "first"]);
  });

  it("lists everyone's investigations for a lead, with owner names", async () => {
    await save(alice.id, "alice case");
    await save(bob.id, "bob case");

    const { items } = await listInvestigationsForUser(lead, { limit: 10 });

    expect(items.map((i) => `${i.ownerName}: ${i.question}`)).toEqual(["Bob: bob case", "Alice: alice case"]);
  });

  it("paginates with a cursor", async () => {
    for (const q of ["q1", "q2", "q3"]) await save(alice.id, q);

    const page1 = await listInvestigationsForUser(alice, { limit: 2 });
    const page2 = await listInvestigationsForUser(alice, { limit: 2, cursor: page1.nextCursor ?? undefined });

    expect(page1.items.map((i) => i.question)).toEqual(["q3", "q2"]);
    expect(page2.items.map((i) => i.question)).toEqual(["q1"]);
    expect(page2.nextCursor).toBeNull();
  });
});

describe("investigation API", () => {
  it("requires sign-in for the list and the detail", async () => {
    asUser(null);
    const { id } = await save(alice.id, "x");

    expect((await list(new Request("http://localhost/api/v1/investigations"))).status).toBe(401);
    expect((await getById(id)).status).toBe(401);
  });

  it("returns 404, not 403, for another engineer's investigation so its existence is not revealed", async () => {
    const { id } = await save(alice.id, "Alice's case");
    asUser(bob);

    const response = await getById(id);

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toMatchObject({ error: { code: "not_found" } });
  });

  it("returns 404 for a malformed ID", async () => {
    asUser(alice);

    expect((await getById("not-a-uuid")).status).toBe(404);
  });

  it("returns the owner's investigation", async () => {
    const { id } = await save(alice.id, "Alice's case");
    asUser(alice);

    const response = await getById(id);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ id, question: "Alice's case", citations: [citation] });
  });

  it("lists with pagination and validates the limit", async () => {
    for (const q of ["q1", "q2", "q3"]) await save(alice.id, q);
    asUser(alice);

    const page = await (await list(new Request("http://localhost/api/v1/investigations?limit=2"))).json();
    const bad = await list(new Request("http://localhost/api/v1/investigations?limit=500"));

    expect(page.items).toHaveLength(2);
    expect(page.nextCursor).toEqual(expect.any(String));
    expect(bad.status).toBe(400);
  });

  it("saves every answered question and returns its investigation ID", async () => {
    asUser(alice);

    const answer = await (
      await postAnswer(
        new Request("http://localhost/api/v1/answers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question: "webhook retries" }),
        }),
      )
    ).json();

    expect(answer.investigationId).toEqual(expect.any(String));
    const saved = await getInvestigationForUser(alice, answer.investigationId);
    expect(saved).toMatchObject({ question: "webhook retries", mode: "search" });
  });

  it("does not save requests that only asked for missing scope fields", async () => {
    asUser(alice);

    const answer = await (
      await postAnswer(
        new Request("http://localhost/api/v1/answers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question: "Why?", scope: { accountId: "acct_bg_001" } }),
        }),
      )
    ).json();

    expect(answer.stopReason).toBe("needs_scope");
    expect(answer.investigationId).toBeNull();
  });
});
