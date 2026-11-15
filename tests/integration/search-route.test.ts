import { sql } from "drizzle-orm";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.hoisted(() => vi.fn());
vi.mock("@/auth", () => ({ auth: authMock }));

import { POST } from "@/app/api/v1/search/route";
import { getDb } from "@/lib/db/client";
import { importKnowledgeFiles } from "@/lib/rag/importer";
import { loadKnowledgeFixtures } from "../support/knowledge-fixtures";

const session = {
  user: { id: "8f6c1a52-0d7e-4d8a-9a43-2f7d0b1e9c11", name: "Octo", email: null, image: null, role: "engineer" },
  expires: "2099-01-01T00:00:00.000Z",
};

function post(body: unknown, raw = false) {
  return POST(
    new Request("http://localhost/api/v1/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: raw ? (body as string) : JSON.stringify(body),
    }),
  );
}

describe("POST /api/v1/search", () => {
  beforeAll(async () => {
    // No OPENAI_API_KEY in tests: the route runs in keyword mode and never calls a model.
    vi.stubEnv("OPENAI_API_KEY", "");
    await getDb().execute(sql`truncate table documents cascade`);
    await importKnowledgeFiles(loadKnowledgeFixtures(), { embedder: null });
  });

  beforeEach(() => {
    authMock.mockReset();
    authMock.mockResolvedValue(session);
  });

  it("returns 401 when signed out", async () => {
    authMock.mockResolvedValue(null);

    const response = await post({ query: "webhook" });

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({ error: { code: "unauthorized" } });
  });

  it("returns 400 for a body that is not JSON", async () => {
    const response = await post("not json", true);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ error: { code: "invalid_request" } });
  });

  it.each([[{}], [{ query: "a" }], [{ query: "webhook", limit: 50 }]])(
    "returns 400 with the standard error body for invalid input %j",
    async (body) => {
      const response = await post(body);

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.error.code).toBe("invalid_request");
      expect(json.error.message).toMatch(/query|limit/);
    },
  );

  it("returns matching evidence with real IDs, titles, kinds and excerpts", async () => {
    const response = await post({ query: "HTTP 410 gone endpoint", limit: 3 });

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    const json = await response.json();
    expect(json.mode).toBe("keyword");
    expect(json.results[0]).toMatchObject({
      id: "KB-FIX-001",
      chunkId: expect.stringMatching(/^KB-FIX-001#c\d{3}$/),
      title: "Webhook Delivery Retries",
      kind: "api_doc",
      authority: "official",
      section: expect.any(String),
      excerpt: expect.stringContaining("410"),
      score: expect.any(Number),
    });
    expect(json.results.length).toBeLessThanOrEqual(3);
  });

  it("returns 200 with an empty list when nothing matches", async () => {
    const response = await post({ query: "chocolate cake recipe" });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ mode: "keyword", results: [] });
  });
});
