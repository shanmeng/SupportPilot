import { describe, expect, it } from "vitest";
import { chunkMarkdown } from "@/lib/rag/chunker";

const body = `# Webhook Delivery Retries

## Delivery attempts

Each event is delivered to every enabled endpoint.

## Retry schedule

Failed deliveries are retried for up to 72 hours.
`;

describe("chunkMarkdown", () => {
  it("splits by heading and records each chunk's section", () => {
    const chunks = chunkMarkdown(body);

    expect(chunks.map((c) => c.section)).toEqual(["Delivery attempts", "Retry schedule"]);
    expect(chunks.map((c) => c.index)).toEqual([0, 1]);
  });

  it("merges a title heading with no text of its own into the next section", () => {
    const [first] = chunkMarkdown(body);

    expect(first.content).toBe(
      "# Webhook Delivery Retries\n\n## Delivery attempts\n\nEach event is delivered to every enabled endpoint.",
    );
  });

  it("keeps every chunk at or under the size limit by splitting long sections on paragraphs", () => {
    const paragraph = "Retries use exponential backoff. ".repeat(10).trim();
    const long = `## Long section\n\n${[paragraph, paragraph, paragraph, paragraph].join("\n\n")}\n`;

    const chunks = chunkMarkdown(long, { maxChars: 700 });

    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) {
      expect(chunk.content.length).toBeLessThanOrEqual(700);
      expect(chunk.section).toBe("Long section");
    }
  });

  it("hard-splits a single paragraph that is longer than the limit", () => {
    const chunks = chunkMarkdown(`## Wall\n\n${"x".repeat(2500)}`, { maxChars: 1000 });

    expect(chunks.length).toBe(3);
    expect(chunks.every((c) => c.content.length <= 1000)).toBe(true);
  });

  it("does not treat '#' lines inside code fences as headings", () => {
    const withCode = "## Example\n\n```bash\n# a shell comment\ncurl https://api.example.test\n```\n";

    const chunks = chunkMarkdown(withCode);

    expect(chunks).toHaveLength(1);
    expect(chunks[0].content).toContain("# a shell comment");
  });

  it("returns no chunks for an empty body", () => {
    expect(chunkMarkdown("   \n")).toEqual([]);
  });
});
