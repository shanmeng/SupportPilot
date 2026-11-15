import { describe, expect, it, vi } from "vitest";
import { createResponsesModel, getChatModel } from "@/lib/llm/responses-client";

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

const tool = {
  name: "searchDocuments",
  description: "Search the documentation.",
  parameters: {
    type: "object",
    properties: { query: { type: "string" } },
    required: ["query"],
    additionalProperties: false,
  },
};

describe("createResponsesModel", () => {
  it("posts instructions, input and strict function tools to /v1/responses", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(200, { id: "resp_1", output: [] }));
    const model = createResponsesModel({ apiKey: "sk-test-key", model: "gpt-6.1-sol", fetchImpl });

    await model.respond({ instructions: "Be careful.", input: "What is HTTP 410?", tools: [tool] });

    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe("https://api.openai.com/v1/responses");
    expect(init.method).toBe("POST");
    expect(init.headers.Authorization).toBe("Bearer sk-test-key");
    expect(JSON.parse(init.body)).toEqual({
      model: "gpt-6.1-sol",
      instructions: "Be careful.",
      input: "What is HTTP 410?",
      tools: [{ type: "function", strict: true, ...tool }],
      parallel_tool_calls: false,
    });
  });

  it("sends tool results as function_call_output items chained to the previous response", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(200, { id: "resp_2", output: [] }));
    const model = createResponsesModel({ apiKey: "k", model: "m", fetchImpl });

    await model.respond({
      instructions: "i",
      input: [{ callId: "call_1", output: '{"results":[]}' }],
      tools: [tool],
      previousResponseId: "resp_1",
    });

    const body = JSON.parse(fetchImpl.mock.calls[0][1].body);
    expect(body.previous_response_id).toBe("resp_1");
    expect(body.input).toEqual([{ type: "function_call_output", call_id: "call_1", output: '{"results":[]}' }]);
  });

  it("parses function calls and output text", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse(200, {
        id: "resp_3",
        output: [
          { type: "reasoning", id: "rs_1", summary: [] },
          { type: "function_call", call_id: "call_9", name: "searchDocuments", arguments: '{"query":"410"}' },
          { type: "message", role: "assistant", content: [{ type: "output_text", text: "Hello " }, { type: "output_text", text: "world" }] },
        ],
      }),
    );
    const model = createResponsesModel({ apiKey: "k", model: "m", fetchImpl });

    const turn = await model.respond({ instructions: "i", input: "q", tools: [tool] });

    expect(turn).toEqual({
      responseId: "resp_3",
      text: "Hello world",
      toolCalls: [{ callId: "call_9", name: "searchDocuments", arguments: '{"query":"410"}' }],
    });
  });

  it("fails with the HTTP status and never includes the API key", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(401, { error: { message: "bad key sk-test-key" } }));
    const model = createResponsesModel({ apiKey: "sk-test-key", model: "m", fetchImpl });

    const error = await model.respond({ instructions: "i", input: "q", tools: [] }).catch((e: Error) => e);

    expect((error as Error).message).toMatch(/HTTP 401/);
    expect((error as Error).message).not.toContain("sk-test-key");
  });
});

describe("getChatModel", () => {
  it("returns null unless both the API key and the model are configured", () => {
    expect(getChatModel({})).toBeNull();
    expect(getChatModel({ OPENAI_API_KEY: "k" })).toBeNull();
    expect(getChatModel({ OPENAI_CHAT_MODEL: "gpt-6.1-sol" })).toBeNull();
  });

  it("uses the configured model", () => {
    expect(getChatModel({ OPENAI_API_KEY: "k", OPENAI_CHAT_MODEL: "gpt-6.1-sol" })?.model).toBe("gpt-6.1-sol");
  });
});
