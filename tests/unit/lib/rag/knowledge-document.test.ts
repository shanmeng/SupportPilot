import { describe, expect, it } from "vitest";
import { parseKnowledgeDocument } from "@/lib/rag/knowledge-document";
import { loadKnowledgeFixtures } from "../../../support/knowledge-fixtures";

const [webhookRetries] = loadKnowledgeFixtures();

describe("parseKnowledgeDocument", () => {
  it("reads the real document ID, title, kind, authority and metadata from front matter", () => {
    const doc = parseKnowledgeDocument(webhookRetries.raw, webhookRetries.path);

    expect(doc).toMatchObject({
      id: "KB-FIX-001",
      title: "Webhook Delivery Retries",
      kind: "api_doc",
      authority: "official",
      language: "en",
      productAreas: ["webhooks"],
      ruleIds: ["RULE-FIX-WEBHOOK-001"],
      effectiveFrom: "2025-10-01",
      effectiveTo: null,
      sourcePath: webhookRetries.path,
    });
  });

  it("returns the Markdown body without the front matter", () => {
    const doc = parseKnowledgeDocument(webhookRetries.raw, webhookRetries.path);

    expect(doc.body.startsWith("# Webhook Delivery Retries")).toBe(true);
    expect(doc.body).not.toContain("doc_id:");
  });

  it("computes a stable SHA-256 content hash", () => {
    const a = parseKnowledgeDocument(webhookRetries.raw, webhookRetries.path);
    const b = parseKnowledgeDocument(webhookRetries.raw, "elsewhere.md");
    const changed = parseKnowledgeDocument(webhookRetries.raw.replace("72 hours", "48 hours"), webhookRetries.path);

    expect(a.contentHash).toMatch(/^[0-9a-f]{64}$/);
    expect(b.contentHash).toBe(a.contentHash);
    expect(changed.contentHash).not.toBe(a.contentHash);
  });

  it("rejects a file without front matter, naming the file", () => {
    expect(() => parseKnowledgeDocument("# Just a heading\n", "docs/no-front-matter.md")).toThrow(
      /docs\/no-front-matter\.md.*front matter/,
    );
  });

  it("rejects documents with a missing or malformed doc_id instead of inventing one", () => {
    const missingId = webhookRetries.raw.replace("doc_id: KB-FIX-001\n", "");
    const badId = webhookRetries.raw.replace("doc_id: KB-FIX-001", "doc_id: not an id");

    expect(() => parseKnowledgeDocument(missingId, "a.md")).toThrow(/doc_id/);
    expect(() => parseKnowledgeDocument(badId, "b.md")).toThrow(/doc_id/);
  });

  it("rejects an unknown doc_type", () => {
    const raw = webhookRetries.raw.replace("doc_type: api_doc", "doc_type: blog_post");

    expect(() => parseKnowledgeDocument(raw, "c.md")).toThrow(/doc_type/);
  });
});
