import { describe, expect, it, vi } from "vitest";
import { runDocumentAgent, type DocumentTools } from "@/lib/agent/document-agent";
import type { ChatModel, ModelRequest, ModelTurn } from "@/lib/llm/responses-client";

const retryDoc = {
  id: "KB-FIX-001",
  chunkId: "KB-FIX-001#c003",
  title: "Webhook Delivery Retries",
  kind: "api_doc" as const,
  authority: "official" as const,
  section: "Gone endpoints",
  excerpt: "If an endpoint responds with HTTP 410 Gone, retries stop and the endpoint is disabled.",
  score: 0.03,
};

function scriptedModel(turns: Partial<ModelTurn>[]): ChatModel & { requests: ModelRequest[] } {
  const requests: ModelRequest[] = [];
  let i = 0;
  return {
    model: "fake-model",
    requests,
    async respond(request) {
      requests.push(request);
      const turn = turns[Math.min(i, turns.length - 1)];
      i += 1;
      return { responseId: `resp_${i}`, text: "", toolCalls: [], ...turn };
    },
  };
}

function call(name: string, args: unknown, id = Math.random().toString(36).slice(2)) {
  return { callId: `call_${id}`, name, arguments: JSON.stringify(args) };
}

function fakeTools(overrides: Partial<DocumentTools> = {}): DocumentTools {
  return {
    searchDocuments: vi.fn().mockResolvedValue([retryDoc]),
    readDocument: vi.fn().mockResolvedValue({
      id: "KB-FIX-001",
      title: "Webhook Delivery Retries",
      kind: "api_doc",
      content: "## Gone endpoints\n\nIf an endpoint responds with HTTP 410 Gone, retries stop.",
    }),
    ...overrides,
  };
}

describe("runDocumentAgent", () => {
  it("searches, then answers with citations verified against retrieved documents", async () => {
    const model = scriptedModel([
      { toolCalls: [call("searchDocuments", { query: "HTTP 410 endpoint" })] },
      { text: "After HTTP 410 the endpoint is disabled and retries stop [KB-FIX-001]." },
    ]);
    const tools = fakeTools();

    const result = await runDocumentAgent("What happens after HTTP 410?", { model, tools });

    expect(tools.searchDocuments).toHaveBeenCalledWith("HTTP 410 endpoint");
    expect(result.stopReason).toBe("answered");
    expect(result.answer).toContain("retries stop");
    expect(result.citations).toEqual([
      {
        id: "KB-FIX-001",
        title: "Webhook Delivery Retries",
        excerpt: retryDoc.excerpt,
        kind: "document",
        detail: "API doc · Gone endpoints",
      },
    ]);
    expect(result.steps).toEqual([{ tool: "searchDocuments", label: "Searched documentation", outcome: "ok" }]);
  });

  it("removes cited IDs that no tool returned in this run, so they never appear as verified", async () => {
    const model = scriptedModel([
      { toolCalls: [call("searchDocuments", { query: "410" })] },
      { text: "Retries stop [KB-FIX-001]. See also [KB-API-999]." },
    ]);

    const result = await runDocumentAgent("410?", { model, tools: fakeTools() });

    expect(result.citations.map((c) => c.id)).toEqual(["KB-FIX-001"]);
    expect(result.removedCitations).toEqual(["KB-API-999"]);
    expect(result.answer).not.toContain("KB-API-999");
  });

  it("does not return a model answer when no tool found any evidence", async () => {
    const model = scriptedModel([
      { toolCalls: [call("searchDocuments", { query: "chocolate cake" })] },
      { text: "Bake at 180 degrees [KB-FIX-001]." },
    ]);
    const tools = fakeTools({ searchDocuments: vi.fn().mockResolvedValue([]) });

    const result = await runDocumentAgent("chocolate cake?", { model, tools });

    expect(result.stopReason).toBe("no_evidence");
    expect(result.citations).toEqual([]);
    expect(result.answer).not.toContain("180");
    expect(result.answer).toMatch(/couldn't find/i);
    expect(result.steps[0].outcome).toBe("empty");
  });

  it("does not trust an answer given without calling any tool", async () => {
    const model = scriptedModel([{ text: "Retries stop after 410 [KB-FIX-001]." }]);

    const result = await runDocumentAgent("410?", { model, tools: fakeTools() });

    expect(result.stopReason).toBe("no_evidence");
    expect(result.citations).toEqual([]);
  });

  it("skips duplicate tool calls without running the tool again", async () => {
    const model = scriptedModel([
      { toolCalls: [call("searchDocuments", { query: "410" })] },
      { toolCalls: [call("searchDocuments", { query: "410" })] },
      { text: "Retries stop [KB-FIX-001]." },
    ]);
    const tools = fakeTools();

    const result = await runDocumentAgent("410?", { model, tools });

    expect(tools.searchDocuments).toHaveBeenCalledTimes(1);
    expect(result.steps.map((s) => s.outcome)).toEqual(["ok", "duplicate"]);
    expect(result.stopReason).toBe("answered");
  });

  it("stops at the tool budget and tells the model to answer with what it has", async () => {
    const model = scriptedModel([
      { toolCalls: [call("searchDocuments", { query: "a" })] },
      { toolCalls: [call("searchDocuments", { query: "b" })] },
      { toolCalls: [call("searchDocuments", { query: "c" })] },
      { toolCalls: [call("searchDocuments", { query: "d" })] },
      { text: "Retries stop [KB-FIX-001]." },
    ]);
    const tools = fakeTools();

    const result = await runDocumentAgent("410?", { model, tools });

    expect(tools.searchDocuments).toHaveBeenCalledTimes(3);
    expect(result.steps.at(-1)?.outcome).toBe("budget");
    expect(JSON.stringify(model.requests[4].input)).toMatch(/budget/i);
    expect(result.stopReason).toBe("answered");
  });

  it("stops at the model-call budget and returns only the sources it actually retrieved", async () => {
    let n = 0;
    const model = scriptedModel(
      Array.from({ length: 10 }, () => ({ toolCalls: [call("readDocument", { id: `KB-FIX-00${(n++ % 1) + 1}` })] })),
    );

    const result = await runDocumentAgent("410?", { model, tools: fakeTools() });

    expect(model.requests).toHaveLength(5);
    expect(result.stopReason).toBe("budget_exhausted");
    expect(result.citations.map((c) => c.id)).toEqual(["KB-FIX-001"]);
  });

  it("rejects invalid tool arguments and unknown tools without running anything", async () => {
    const model = scriptedModel([
      { toolCalls: [call("searchDocuments", { query: "" }), call("deleteEverything", { all: true })] },
      { text: "I could not search." },
    ]);
    const tools = fakeTools();

    const result = await runDocumentAgent("?", { model, tools });

    expect(tools.searchDocuments).not.toHaveBeenCalled();
    expect(result.steps.map((s) => s.outcome)).toEqual(["rejected", "rejected"]);
    expect(result.stopReason).toBe("no_evidence");
  });

  it("passes retrieved text to the model as untrusted data", async () => {
    const model = scriptedModel([
      { toolCalls: [call("searchDocuments", { query: "410" })] },
      { text: "Retries stop [KB-FIX-001]." },
    ]);

    await runDocumentAgent("410?", { model, tools: fakeTools() });

    expect(model.requests[0].instructions).toMatch(/untrusted/i);
    const output = JSON.parse((model.requests[1].input as { output: string }[])[0].output);
    expect(output.note).toMatch(/untrusted/i);
    expect(output.results[0].id).toBe("KB-FIX-001");
  });

  it("reports tool failures as a step outcome and keeps going", async () => {
    const model = scriptedModel([
      { toolCalls: [call("searchDocuments", { query: "410" })] },
      { text: "Search failed." },
    ]);
    const tools = fakeTools({ searchDocuments: vi.fn().mockRejectedValue(new Error("db down")) });

    const result = await runDocumentAgent("410?", { model, tools });

    expect(result.steps[0].outcome).toBe("error");
    expect(result.stopReason).toBe("no_evidence");
  });

  it("returns an error result when the model call fails", async () => {
    const model: ChatModel = { model: "m", respond: vi.fn().mockRejectedValue(new Error("HTTP 500")) };

    const result = await runDocumentAgent("410?", { model, tools: fakeTools() });

    expect(result.stopReason).toBe("error");
    expect(result.citations).toEqual([]);
  });

  it("reports each step as it happens", async () => {
    const model = scriptedModel([
      { toolCalls: [call("searchDocuments", { query: "410" })] },
      { toolCalls: [call("readDocument", { id: "KB-FIX-001" })] },
      { text: "Retries stop [KB-FIX-001]." },
    ]);
    const onStep = vi.fn();

    await runDocumentAgent("410?", { model, tools: fakeTools(), onStep });

    expect(onStep.mock.calls.map(([step]) => step.label)).toEqual([
      "Searched documentation",
      "Read KB-FIX-001",
    ]);
  });
});
