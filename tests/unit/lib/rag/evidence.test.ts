import { describe, expect, it } from "vitest";
import { evidenceKey, toEvidenceSource } from "@/lib/rag/evidence";

describe("toEvidenceSource", () => {
  it("maps a search result to a document citation without changing its ID, title or excerpt", () => {
    const source = toEvidenceSource({
      id: "KB-TS-006",
      chunkId: "KB-TS-006#c002",
      title: "FP-4021 Payment Method Declined",
      kind: "troubleshooting",
      authority: "operational_guidance",
      section: "Symptom",
      excerpt: "Creating or processing a Payment returns HTTP 402 with `FP-4021`.",
      score: 0.016,
    });

    expect(source).toEqual({
      id: "KB-TS-006",
      title: "FP-4021 Payment Method Declined",
      excerpt: "Creating or processing a Payment returns HTTP 402 with `FP-4021`.",
      kind: "document",
      detail: "Troubleshooting · Symptom",
    });
  });

  it.each([
    ["api_doc", "API doc"],
    ["business_rule", "Business rule"],
    ["support_case", "Support case (historical)"],
    ["release_note", "Release note"],
    ["migration_guide", "Migration guide"],
  ] as const)("labels %s documents as %s", (kind, label) => {
    const source = toEvidenceSource({
      id: "KB-X-1",
      chunkId: "KB-X-1#c001",
      title: "T",
      kind,
      authority: "official",
      section: "S",
      excerpt: "E",
      score: 0,
    });

    expect(source.detail).toBe(`${label} · S`);
  });
});

describe("evidenceKey", () => {
  it("combines kind and ID so a document and a record with the same ID stay distinct", () => {
    expect(evidenceKey({ id: "x1", title: "", excerpt: "", kind: "document" })).toBe("document:x1");
    expect(evidenceKey({ id: "x1", title: "", excerpt: "", kind: "record" })).toBe("record:x1");
  });
});
