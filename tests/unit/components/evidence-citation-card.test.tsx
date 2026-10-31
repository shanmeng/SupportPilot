import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import {
  EvidenceCitationCard,
  EvidenceCitationList,
} from "@/components/chat/evidence-citation-card";
import type { EvidenceSource } from "@/types/evidence";

const documentSource: EvidenceSource = {
  id: "doc_fixture_retry_policy",
  title: "Fixture Retry Policy",
  excerpt: "Fixture excerpt: failed deliveries are retried.",
  kind: "document",
};

const recordSource: EvidenceSource = {
  id: "delivery_fixture_01",
  title: "Fixture Delivery Record",
  excerpt: "Fixture excerpt: delivery attempt returned HTTP 410.",
  kind: "record",
};

describe("EvidenceCitationCard", () => {
  it("renders the exact title, id, excerpt and kind of a document source", () => {
    render(<EvidenceCitationCard source={documentSource} />);

    const card = screen.getByRole("article", { name: "Fixture Retry Policy" });
    expect(within(card).getByText("Document")).toBeInTheDocument();
    expect(within(card).getByText("doc_fixture_retry_policy")).toBeInTheDocument();
    expect(
      within(card).getByText("Fixture excerpt: failed deliveries are retried."),
    ).toBeInTheDocument();
  });

  it("labels record sources as records", () => {
    render(<EvidenceCitationCard source={recordSource} />);

    const card = screen.getByRole("article", { name: "Fixture Delivery Record" });
    expect(within(card).getByText("Record")).toBeInTheDocument();
    expect(within(card).queryByText("Document")).not.toBeInTheDocument();
    expect(within(card).getByText("delivery_fixture_01")).toBeInTheDocument();
  });

  it("is not focusable when no selection handler is given", () => {
    render(<EvidenceCitationCard source={documentSource} />);

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("exposes a keyboard-operable button with visible focus styling when selectable", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<EvidenceCitationCard source={recordSource} onSelect={onSelect} />);

    const button = screen.getByRole("button", {
      name: "View record Fixture Delivery Record (delivery_fixture_01)",
    });
    await user.tab();
    expect(button).toHaveFocus();
    expect(button.className).toMatch(/focus-visible:outline/);

    await user.keyboard("{Enter}");
    expect(onSelect).toHaveBeenCalledWith(recordSource);
  });
});

describe("EvidenceCitationList", () => {
  it("renders one card per source in order inside a labelled list", () => {
    render(<EvidenceCitationList sources={[documentSource, recordSource]} />);

    const list = screen.getByRole("list", { name: "Evidence sources" });
    const items = within(list).getAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(within(items[0]).getByText("doc_fixture_retry_policy")).toBeInTheDocument();
    expect(within(items[1]).getByText("delivery_fixture_01")).toBeInTheDocument();
  });

  it("shows a neutral empty state and no identifiers when there are no sources", () => {
    render(<EvidenceCitationList sources={[]} />);

    expect(screen.getByText("No verified sources")).toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
    expect(screen.queryByRole("article")).not.toBeInTheDocument();
  });
});
