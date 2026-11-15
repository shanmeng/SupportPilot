import { describe, expect, it, vi } from "vitest";
import { askDocumentation } from "@/lib/api/search-client";

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

describe("askDocumentation", () => {
  const citation = {
    id: "KB-TS-006",
    title: "FP-4021 Payment Method Declined",
    excerpt: "Returns HTTP 402 with FP-4021.",
    kind: "document",
    detail: "Troubleshooting · Symptom",
  };

  it("posts the question to /api/v1/answers and returns the agent answer, citations and steps", async () => {
    const steps = [{ tool: "searchDocuments", label: "Searched documentation", outcome: "ok" }];
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse(200, {
        mode: "agent",
        answer: "The card was declined [KB-TS-006].",
        stopReason: "answered",
        steps,
        removedCitations: [],
        citations: [citation],
      }),
    );

    const answer = await askDocumentation("card declined", fetchImpl);

    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe("/api/v1/answers");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual({ question: "card declined" });
    expect(answer).toEqual({
      answer: "The card was declined [KB-TS-006].",
      stopReason: "answered",
      steps,
      sources: [citation],
    });
  });

  it("returns citations without an answer in search-only mode", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse(200, { mode: "search", answer: null, stopReason: null, steps: [], removedCitations: [], citations: [citation] }),
    );

    await expect(askDocumentation("card declined", fetchImpl)).resolves.toEqual({
      answer: null,
      stopReason: null,
      steps: [],
      sources: [citation],
    });
  });

  it("explains an expired session", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(401, { error: { code: "unauthorized", message: "x" } }));

    await expect(askDocumentation("q?", fetchImpl)).rejects.toThrow("Your session has expired. Sign in again.");
  });

  it("shows the server's validation message for invalid input", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(jsonResponse(400, { error: { code: "invalid_request", message: "question must be 2-500 characters" } }));

    await expect(askDocumentation("q", fetchImpl)).rejects.toThrow("question must be 2-500 characters");
  });

  it("uses a generic message for server errors and network failures", async () => {
    const serverError = vi.fn().mockResolvedValue(new Response("boom", { status: 500 }));
    const offline = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));

    await expect(askDocumentation("q?", serverError)).rejects.toThrow("Search is unavailable right now. Try again.");
    await expect(askDocumentation("q?", offline)).rejects.toThrow("Search is unavailable right now. Try again.");
  });
});
