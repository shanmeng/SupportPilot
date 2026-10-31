import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  EvidenceCitations,
  MAX_EXCERPT_LENGTH,
  shortenExcerpt,
  type EvidenceSource,
} from "./EvidenceCitations";

const sources: EvidenceSource[] = [
  {
    id: "doc_webhook_retry_example",
    title: "Webhook Retry Policy",
    kind: "document",
    excerpt: "Delivery failures may trigger retry attempts according to policy.",
  },
  {
    id: "delivery_example_01",
    title: "Webhook Delivery Record",
    kind: "record",
    excerpt: "Status: failed after 3 attempts.",
  },
];

describe("EvidenceCitations", () => {
  it("renders one card per source with title, exact ID, kind and excerpt", () => {
    render(<EvidenceCitations sources={sources} />);

    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(2);

    const doc = within(items[0]);
    expect(doc.getByRole("heading", { name: "Webhook Retry Policy" })).toBeInTheDocument();
    expect(doc.getByText("doc_webhook_retry_example")).toBeInTheDocument();
    expect(doc.getByText("Document")).toBeInTheDocument();
    expect(
      doc.getByText("Delivery failures may trigger retry attempts according to policy."),
    ).toBeInTheDocument();

    const record = within(items[1]);
    expect(record.getByRole("heading", { name: "Webhook Delivery Record" })).toBeInTheDocument();
    expect(record.getByText("delivery_example_01")).toBeInTheDocument();
    expect(record.getByText("Record")).toBeInTheDocument();
    expect(record.getByText("Status: failed after 3 attempts.")).toBeInTheDocument();
  });

  it("labels each card with its kind and title for assistive technology", () => {
    render(<EvidenceCitations sources={sources} />);

    expect(
      screen.getByRole("article", { name: "Document: Webhook Retry Policy" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("article", { name: "Record: Webhook Delivery Record" }),
    ).toBeInTheDocument();
  });

  it("shows the source count in the heading", () => {
    render(<EvidenceCitations sources={sources} />);

    expect(screen.getByRole("heading", { name: "Evidence sources (2)" })).toBeInTheDocument();
  });

  it("shows a neutral empty state when there are no sources", () => {
    render(<EvidenceCitations sources={[]} />);

    expect(screen.getByRole("heading", { name: "Evidence sources" })).toBeInTheDocument();
    expect(screen.getByText("No evidence sources were cited for this answer.")).toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
    expect(screen.queryByRole("article")).not.toBeInTheDocument();
  });

  it("renders source IDs exactly as provided", () => {
    const id = "evt_2026-10-30T12:00:00Z/attempt#3";
    render(
      <EvidenceCitations sources={[{ id, title: "Event", kind: "record", excerpt: "x" }]} />,
    );

    expect(screen.getByText(id).tagName).toBe("CODE");
  });

  it("shortens long excerpts", () => {
    const excerpt = "retry ".repeat(100);
    render(
      <EvidenceCitations
        sources={[{ id: "doc_long", title: "Long", kind: "document", excerpt }]}
      />,
    );

    const shown = screen.getByText(/^retry/).textContent ?? "";
    expect(shown.length).toBeLessThanOrEqual(MAX_EXCERPT_LENGTH);
    expect(shown.endsWith("…")).toBe(true);
  });
});

describe("shortenExcerpt", () => {
  it("leaves short excerpts unchanged apart from whitespace normalisation", () => {
    expect(shortenExcerpt("  Returns   HTTP 410\n disables the endpoint. ")).toBe(
      "Returns HTTP 410 disables the endpoint.",
    );
  });

  it("breaks on a word boundary and appends an ellipsis", () => {
    expect(shortenExcerpt("alpha beta gamma delta", 15)).toBe("alpha beta…");
  });

  it("hard-cuts a single long word", () => {
    expect(shortenExcerpt("a".repeat(20), 10)).toBe(`${"a".repeat(9)}…`);
  });
});
