import { describe, expect, it, vi } from "vitest";
import { askDocumentation } from "@/lib/api/search-client";

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

const result = {
  id: "KB-TS-006",
  chunkId: "KB-TS-006#c002",
  title: "FP-4021 Payment Method Declined",
  kind: "troubleshooting",
  authority: "operational_guidance",
  section: "Symptom",
  excerpt: "Returns HTTP 402 with FP-4021.",
  score: 0.016,
};

describe("askDocumentation", () => {
  it("posts the question to /api/v1/search and returns citations", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(200, { mode: "keyword", results: [result] }));

    const answer = await askDocumentation("card declined", fetchImpl);

    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe("/api/v1/search");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual({ query: "card declined", limit: 5 });
    expect(answer.sources).toEqual([
      {
        id: "KB-TS-006",
        title: "FP-4021 Payment Method Declined",
        excerpt: "Returns HTTP 402 with FP-4021.",
        kind: "document",
        detail: "Troubleshooting · Symptom",
      },
    ]);
  });

  it("explains an expired session", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(401, { error: { code: "unauthorized", message: "x" } }));

    await expect(askDocumentation("q?", fetchImpl)).rejects.toThrow("Your session has expired. Sign in again.");
  });

  it("shows the server's validation message for invalid input", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(jsonResponse(400, { error: { code: "invalid_request", message: "query must be 2-500 characters" } }));

    await expect(askDocumentation("q", fetchImpl)).rejects.toThrow("query must be 2-500 characters");
  });

  it("uses a generic message for server errors and network failures", async () => {
    const serverError = vi.fn().mockResolvedValue(new Response("boom", { status: 500 }));
    const offline = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));

    await expect(askDocumentation("q?", serverError)).rejects.toThrow("Search is unavailable right now. Try again.");
    await expect(askDocumentation("q?", offline)).rejects.toThrow("Search is unavailable right now. Try again.");
  });
});
