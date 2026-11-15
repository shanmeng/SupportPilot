import { describe, expect, it } from "vitest";
import { toExcerpt } from "@/lib/rag/excerpt";

describe("toExcerpt", () => {
  it("drops leading heading lines and collapses whitespace", () => {
    const content = "# Title\n\n## Retry schedule\n\nFailed deliveries   are retried\nfor up to 72 hours.";

    expect(toExcerpt(content)).toBe("Failed deliveries are retried for up to 72 hours.");
  });

  it("keeps short text unchanged", () => {
    expect(toExcerpt("HTTP 410 disables the endpoint.")).toBe("HTTP 410 disables the endpoint.");
  });

  it("cuts long text at a word boundary and marks the cut", () => {
    const content = "alpha beta gamma delta epsilon zeta eta theta";

    const excerpt = toExcerpt(content, 20);

    expect(excerpt).toBe("alpha beta gamma…");
    expect(excerpt.length).toBeLessThanOrEqual(21);
  });

  it("prefers prose over a leading code block", () => {
    const content = "## Endpoint\n\n```http\nPOST /v1/webhook_endpoints\nGET /v1/webhook_endpoints/{id}\n```\n\nEndpoints belong to one account and environment.";

    expect(toExcerpt(content)).toBe("Endpoints belong to one account and environment.");
  });

  it("falls back to the code text when a chunk has nothing else", () => {
    const content = "## Endpoint\n\n```http\nPOST /v1/webhook_endpoints\n```";

    expect(toExcerpt(content)).toBe("POST /v1/webhook_endpoints");
  });

  it("only contains text from the source (no invented words)", () => {
    const content = "## Gone endpoints\n\nIf an endpoint responds with HTTP 410 Gone, retries stop immediately.";

    const words = toExcerpt(content, 40).replace("…", "").split(" ");

    for (const word of words) expect(content).toContain(word);
  });
});
