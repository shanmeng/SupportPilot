import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ChatWorkspace } from "@/components/chat/chat-workspace";
import type { HistoryClient } from "@/lib/api/investigations-client";
import type { AskResult } from "@/lib/api/search-client";
import type { EvidenceSource } from "@/types/evidence";

const retryDoc: EvidenceSource = {
  id: "KB-FIX-001",
  title: "Webhook Delivery Retries",
  excerpt: "If an endpoint responds with HTTP 410 Gone, retries stop.",
  kind: "document",
  detail: "API doc · Gone endpoints",
};
const troubleshootingDoc: EvidenceSource = {
  id: "KB-FIX-002",
  title: "Troubleshooting a Missing Webhook Notification",
  excerpt: "Confirm the account ID and the environment.",
  kind: "document",
  detail: "Troubleshooting · Check the scope first",
};

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const emptyHistory: HistoryClient = { list: vi.fn().mockResolvedValue([]), get: vi.fn() };

function setup(ask: (question: string) => Promise<AskResult>, history: HistoryClient = emptyHistory) {
  const user = userEvent.setup();
  render(<ChatWorkspace ask={ask} history={history} />);
  const composer = screen.getByRole("textbox", { name: "Ask a question" });
  return { user, composer };
}

describe("ChatWorkspace", () => {
  it("shows an empty state with a call to action and example questions", () => {
    setup(vi.fn());

    expect(screen.getByRole("heading", { name: "Ask about payments and webhooks" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /^Ask: / }).length).toBeGreaterThan(0);
    expect(screen.getByText("No saved investigations yet")).toBeInTheDocument();
  });

  it("submits the typed question with Enter and shows it as a message", async () => {
    const ask = vi.fn().mockResolvedValue({ sources: [retryDoc] });
    const { user, composer } = setup(ask);

    await user.type(composer, "What happens after HTTP 410?{Enter}");

    expect(ask).toHaveBeenCalledWith("What happens after HTTP 410?");
    expect(await screen.findByText("What happens after HTTP 410?")).toBeInTheDocument();
    expect(composer).toHaveValue("");
  });

  it("adds a newline with Shift+Enter instead of submitting", async () => {
    const ask = vi.fn();
    const { user, composer } = setup(ask);

    await user.type(composer, "line one{Shift>}{Enter}{/Shift}line two");

    expect(ask).not.toHaveBeenCalled();
    expect(composer).toHaveValue("line one\nline two");
  });

  it("does not submit an empty or whitespace-only question", async () => {
    const ask = vi.fn();
    const { user, composer } = setup(ask);

    await user.type(composer, "   {Enter}");

    expect(ask).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Send" })).toBeDisabled();
  });

  it("shows readable progress and disables sending while a search is running", async () => {
    const pending = deferred<AskResult>();
    const { user, composer } = setup(() => pending.promise);

    await user.type(composer, "webhook retries{Enter}");

    expect(screen.getByRole("status")).toHaveTextContent("Searching documentation…");
    expect(screen.getByRole("button", { name: "Send" })).toBeDisabled();

    pending.resolve({ sources: [] });
    expect(await screen.findByText("No verified sources")).toBeInTheDocument();
  });

  it("renders citation cards for the matching documentation", async () => {
    const { user, composer } = setup(vi.fn().mockResolvedValue({ sources: [retryDoc, troubleshootingDoc] }));

    await user.type(composer, "missing webhook{Enter}");

    const list = await screen.findByRole("list", { name: "Evidence sources" });
    expect(within(list).getAllByRole("article")).toHaveLength(2);
    expect(within(list).getByText("KB-FIX-001")).toBeInTheDocument();
    expect(screen.getByText(/2 matching documentation sources/)).toBeInTheDocument();
  });

  it("says when nothing matched and shows no citations", async () => {
    const { user, composer } = setup(vi.fn().mockResolvedValue({ sources: [] }));

    await user.type(composer, "chocolate cake{Enter}");

    expect(await screen.findByText("No verified sources")).toBeInTheDocument();
    expect(screen.getByText(/No matching documentation/)).toBeInTheDocument();
    expect(screen.queryByRole("article")).not.toBeInTheDocument();
  });

  it("shows an error with a recovery action that retries the same question", async () => {
    const ask = vi
      .fn()
      .mockRejectedValueOnce(new Error("Search is unavailable right now. Try again."))
      .mockResolvedValueOnce({ sources: [retryDoc] });
    const { user, composer } = setup(ask);

    await user.type(composer, "webhook 410{Enter}");

    expect(await screen.findByRole("alert")).toHaveTextContent("Search is unavailable right now. Try again.");
    await user.click(screen.getByRole("button", { name: "Try again" }));

    expect(ask).toHaveBeenCalledTimes(2);
    expect(ask).toHaveBeenLastCalledWith("webhook 410");
    expect(await screen.findByRole("list", { name: "Evidence sources" })).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows the selected citation in the evidence panel", async () => {
    const { user, composer } = setup(vi.fn().mockResolvedValue({ sources: [retryDoc, troubleshootingDoc] }));
    await user.type(composer, "missing webhook{Enter}");

    await user.click(await screen.findByRole("button", { name: /View document Troubleshooting a Missing/ }));

    const panel = screen.getByRole("complementary", { name: "Selected evidence" });
    expect(within(panel).getByText("KB-FIX-002")).toBeInTheDocument();
    expect(within(panel).getByText("Confirm the account ID and the environment.")).toBeInTheDocument();
  });

  it("starts a new investigation by clearing the conversation", async () => {
    const { user, composer } = setup(vi.fn().mockResolvedValue({ sources: [retryDoc] }));
    await user.type(composer, "webhook{Enter}");
    await screen.findByRole("list", { name: "Evidence sources" });

    await user.click(screen.getByRole("button", { name: "New investigation" }));

    expect(screen.queryByRole("list", { name: "Evidence sources" })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Ask about payments and webhooks" })).toBeInTheDocument();
  });

  it("shows the agent's answer, marks it as AI-generated and lists the steps it took", async () => {
    const { user, composer } = setup(
      vi.fn().mockResolvedValue({
        answer: "After HTTP 410 the endpoint is disabled [KB-FIX-001].",
        stopReason: "answered",
        steps: [
          { tool: "searchDocuments", label: "Searched documentation", outcome: "ok" },
          { tool: "readDocument", label: "Read KB-FIX-001", outcome: "ok" },
        ],
        sources: [retryDoc],
      }),
    );

    await user.type(composer, "What happens after HTTP 410?{Enter}");

    expect(await screen.findByText("After HTTP 410 the endpoint is disabled [KB-FIX-001].")).toBeInTheDocument();
    expect(screen.getByText(/AI-generated answer/)).toBeInTheDocument();
    const steps = screen.getByRole("list", { name: "Agent steps" });
    expect(within(steps).getAllByRole("listitem").map((item) => item.textContent)).toEqual([
      "Searched documentation",
      "Read KB-FIX-001",
    ]);
    expect(within(screen.getByRole("list", { name: "Evidence sources" })).getByText("KB-FIX-001")).toBeInTheDocument();
  });

  it("explains when the agent stopped at its step limit", async () => {
    const { user, composer } = setup(
      vi.fn().mockResolvedValue({
        answer: "I reached the step limit before finishing an answer.",
        stopReason: "budget_exhausted",
        steps: [],
        sources: [retryDoc],
      }),
    );

    await user.type(composer, "webhook{Enter}");

    expect(await screen.findByText(/Stopped at the step limit/)).toBeInTheDocument();
  });

  it("sends the payment scope with the question when investigation fields are filled", async () => {
    const ask = vi.fn().mockResolvedValue({ sources: [] });
    const { user, composer } = setup(ask);

    await user.click(screen.getByRole("button", { name: "Investigate a payment" }));
    await user.type(screen.getByLabelText("Account ID"), "acct_bg_001");
    await user.selectOptions(screen.getByLabelText("Environment"), "production");
    await user.type(screen.getByLabelText("Payment ID"), "pay_bg_001_0003");
    await user.type(composer, "Why was no webhook delivered?{Enter}");

    expect(ask).toHaveBeenCalledWith("Why was no webhook delivered?", {
      accountId: "acct_bg_001",
      environment: "production",
      paymentId: "pay_bg_001_0003",
    });
    const conversation = await screen.findByRole("list", { name: "Conversation" });
    expect(within(conversation).getByText("acct_bg_001 · production · pay_bg_001_0003")).toBeInTheDocument();
  });

  it("shows which scope fields are still needed", async () => {
    const { user, composer } = setup(
      vi.fn().mockResolvedValue({
        answer: "To investigate a payment I need the environment, payment ID. I won't guess them or look in other accounts.",
        stopReason: "needs_scope",
        steps: [],
        sources: [],
      }),
    );

    await user.type(composer, "Why did pay_bg_001_0003 fail?{Enter}");

    expect(await screen.findByText("Needs more information")).toBeInTheDocument();
    expect(screen.getByText(/I need the environment, payment ID/)).toBeInTheDocument();
  });

  it("lists recent cases from the history API", async () => {
    const history: HistoryClient = {
      list: vi.fn().mockResolvedValue([
        { id: "11111111-1111-4111-8111-111111111111", question: "Why no webhook?", ownerName: "Alice", stopReason: "answered", createdAt: "2026-11-15T10:00:00.000Z", scope: null },
      ]),
      get: vi.fn(),
    };
    setup(vi.fn(), history);

    const sidebar = screen.getByRole("complementary", { name: "Investigations" });
    expect(await within(sidebar).findByRole("button", { name: "Open case: Why no webhook?" })).toBeInTheDocument();
    expect(within(sidebar).queryByText("No saved investigations yet")).not.toBeInTheDocument();
  });

  it("reopens a saved investigation with its answer and evidence", async () => {
    const history: HistoryClient = {
      list: vi.fn().mockResolvedValue([
        { id: "11111111-1111-4111-8111-111111111111", question: "Why no webhook?", ownerName: "Alice", stopReason: "answered", createdAt: "2026-11-15T10:00:00.000Z", scope: null },
      ]),
      get: vi.fn().mockResolvedValue({
        id: "11111111-1111-4111-8111-111111111111",
        question: "Why no webhook?",
        scope: { accountId: "acct_bg_001", environment: "production", paymentId: "pay_bg_001_0003" },
        answer: "The delivery is retrying [del_bg_001_0003].",
        stopReason: "answered",
        steps: [{ tool: "listWebhookDeliveries", label: "Listed webhook deliveries for pay_bg_001_0003", outcome: "ok" }],
        citations: [{ id: "del_bg_001_0003", title: "Webhook delivery del_bg_001_0003", excerpt: "retrying · 1 attempt", kind: "record" }],
      }),
    };
    const { user } = setup(vi.fn(), history);

    await user.click(await screen.findByRole("button", { name: "Open case: Why no webhook?" }));

    expect(history.get).toHaveBeenCalledWith("11111111-1111-4111-8111-111111111111");
    expect(await screen.findByText("The delivery is retrying [del_bg_001_0003].")).toBeInTheDocument();
    expect(within(screen.getByRole("list", { name: "Evidence sources" })).getByText("del_bg_001_0003")).toBeInTheDocument();
  });

  it("adds a newly answered question to the top of recent cases", async () => {
    const { user, composer } = setup(
      vi.fn().mockResolvedValue({ sources: [retryDoc], investigationId: "22222222-2222-4222-8222-222222222222" }),
    );

    await user.type(composer, "Fresh question{Enter}");

    const sidebar = screen.getByRole("complementary", { name: "Investigations" });
    expect(await within(sidebar).findByRole("button", { name: "Open case: Fresh question" })).toBeInTheDocument();
  });

  it("asks an example question when it is clicked", async () => {
    const ask = vi.fn().mockResolvedValue({ sources: [] });
    const { user } = setup(ask);

    const [example] = screen.getAllByRole("button", { name: /^Ask: / });
    await user.click(example);

    expect(ask).toHaveBeenCalledWith(example.textContent);
  });
});
