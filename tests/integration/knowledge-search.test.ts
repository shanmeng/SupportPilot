import { sql } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { getDb } from "@/lib/db/client";
import { importKnowledgeFiles } from "@/lib/rag/importer";
import { searchDocuments } from "@/lib/rag/search";
import { createFakeEmbedder } from "../support/fake-embedder";
import { fixtureDocuments, loadKnowledgeFixtures } from "../support/knowledge-fixtures";

const fixtureIds = Object.keys(fixtureDocuments);

async function countRows() {
  const [row] = await getDb().execute<{ documents: number; chunks: number }>(sql`
    select (select count(*)::int from documents) as documents,
           (select count(*)::int from document_chunks) as chunks`);
  return row;
}

describe("knowledge import (real PostgreSQL + pgvector)", () => {
  beforeEach(async () => {
    await getDb().execute(sql`truncate table documents cascade`);
  });

  it("imports English documents with their chunks and embeddings", async () => {
    const summary = await importKnowledgeFiles(loadKnowledgeFixtures(), { embedder: createFakeEmbedder() });

    expect(summary.imported.sort()).toEqual(fixtureIds);
    expect(summary.rejected).toEqual([]);
    const counts = await countRows();
    expect(counts.documents).toBe(3);
    expect(counts.chunks).toBeGreaterThanOrEqual(7);
    const [missing] = await getDb().execute<{ n: number }>(
      sql`select count(*)::int as n from document_chunks where embedding is null`,
    );
    expect(missing.n).toBe(0);
  });

  it("rejects documents that are not English, so production only serves translated docs", async () => {
    const summary = await importKnowledgeFiles(loadKnowledgeFixtures({ includeUntranslated: true }), {
      embedder: createFakeEmbedder(),
    });

    expect(summary.rejected).toEqual([
      { path: expect.stringContaining("KB-FIX-004"), reason: expect.stringMatching(/language/) },
    ]);
    expect((await countRows()).documents).toBe(3);
  });

  it("is idempotent: re-importing unchanged files skips them without duplicating chunks", async () => {
    await importKnowledgeFiles(loadKnowledgeFixtures(), { embedder: createFakeEmbedder() });
    const before = await countRows();
    const embedder = createFakeEmbedder();

    const summary = await importKnowledgeFiles(loadKnowledgeFixtures(), { embedder });

    expect(summary.skipped.sort()).toEqual(fixtureIds);
    expect(embedder.calls).toEqual([]);
    expect(await countRows()).toEqual(before);
  });

  it("replaces the chunks of a changed document", async () => {
    await importKnowledgeFiles(loadKnowledgeFixtures(), { embedder: createFakeEmbedder() });
    const changed = loadKnowledgeFixtures().map((f) =>
      f.path.includes("KB-FIX-001") ? { ...f, raw: f.raw.replace("72 hours", "96 hours") } : f,
    );

    const summary = await importKnowledgeFiles(changed, { embedder: createFakeEmbedder() });

    expect(summary.imported).toEqual(["KB-FIX-001"]);
    const [row] = await getDb().execute<{ n: number }>(
      sql`select count(*)::int as n from document_chunks where content like '%96 hours%'`,
    );
    expect(row.n).toBe(1);
  });

  it("imports without embeddings when no embedder is configured (keyword search still works)", async () => {
    await importKnowledgeFiles(loadKnowledgeFixtures(), { embedder: null });

    const [row] = await getDb().execute<{ n: number }>(
      sql`select count(*)::int as n from document_chunks where embedding is not null`,
    );
    expect(row.n).toBe(0);
  });
});

describe("searchDocuments (real PostgreSQL + pgvector)", () => {
  beforeEach(async () => {
    await getDb().execute(sql`truncate table documents cascade`);
    await importKnowledgeFiles(loadKnowledgeFixtures(), { embedder: createFakeEmbedder() });
  });

  it("finds the matching document for a natural-language question (hybrid mode)", async () => {
    const result = await searchDocuments(
      { query: "What happens after a webhook endpoint returns HTTP 410?", limit: 5 },
      { embedder: createFakeEmbedder() },
    );

    expect(result.mode).toBe("hybrid");
    expect(result.results[0]).toMatchObject({ id: "KB-FIX-001", title: "Webhook Delivery Retries", kind: "api_doc" });
    expect(result.results[0].excerpt).toContain("410");
  });

  it("returns only real document IDs, titles and kinds, with excerpts taken from the stored text", async () => {
    const result = await searchDocuments({ query: "webhook delivery", limit: 5 }, { embedder: createFakeEmbedder() });

    expect(result.results.length).toBeGreaterThan(0);
    for (const hit of result.results) {
      const fixture = fixtureDocuments[hit.id as keyof typeof fixtureDocuments];
      expect(fixture).toBeDefined();
      expect(hit.title).toBe(fixture.title);
      expect(hit.kind).toBe(fixture.kind);
      expect(hit.chunkId).toMatch(new RegExp(`^${hit.id}#c\\d{3}$`));
      expect(hit.excerpt.length).toBeGreaterThan(0);
    }
  });

  it("returns at most one result per document, ordered by score", async () => {
    const result = await searchDocuments({ query: "webhook endpoint delivery retries", limit: 5 }, {
      embedder: createFakeEmbedder(),
    });

    const ids = result.results.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
    const scores = result.results.map((r) => r.score);
    expect(scores).toEqual([...scores].sort((a, b) => b - a));
  });

  it("respects the limit", async () => {
    const result = await searchDocuments({ query: "webhook account endpoint", limit: 1 }, {
      embedder: createFakeEmbedder(),
    });

    expect(result.results).toHaveLength(1);
  });

  it("finds exact identifiers such as error codes", async () => {
    const result = await searchDocuments({ query: "FP-ACCESS-403", limit: 5 }, { embedder: null });

    expect(result.results[0]?.id).toBe("KB-FIX-003");
  });

  it("returns no results for an unrelated question instead of guessing", async () => {
    const result = await searchDocuments({ query: "chocolate cake recipe", limit: 5 }, {
      embedder: createFakeEmbedder(),
    });

    expect(result.results).toEqual([]);
  });

  it("uses keyword mode when no embedder is configured", async () => {
    const result = await searchDocuments({ query: "HTTP 410 gone endpoint", limit: 5 }, { embedder: null });

    expect(result.mode).toBe("keyword");
    expect(result.results[0]?.id).toBe("KB-FIX-001");
  });

  it("falls back to keyword mode when the embedding call fails", async () => {
    const result = await searchDocuments({ query: "HTTP 410 gone endpoint", limit: 5 }, {
      embedder: createFakeEmbedder({ failing: true }),
    });

    expect(result.mode).toBe("keyword");
    expect(result.results[0]?.id).toBe("KB-FIX-001");
  });
});
