import { z } from "zod";

/** A function tool. With `strict`, every property must be required and `additionalProperties: false`. */
export type ToolDefinition = {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
};

export type ToolCall = { callId: string; name: string; arguments: string };
export type ToolOutput = { callId: string; output: string };

export type ModelRequest = {
  instructions: string;
  /** The user question, or the outputs of the previous turn's tool calls. */
  input: string | ToolOutput[];
  tools: ToolDefinition[];
  previousResponseId?: string | null;
};

export type ModelTurn = { responseId: string; text: string; toolCalls: ToolCall[] };

export interface ChatModel {
  model: string;
  respond(request: ModelRequest): Promise<ModelTurn>;
}

const outputItemSchema = z.union([
  z.object({ type: z.literal("function_call"), call_id: z.string(), name: z.string(), arguments: z.string() }),
  z.object({
    type: z.literal("message"),
    content: z.array(z.object({ type: z.string(), text: z.string().optional() })),
  }),
  z.object({ type: z.string() }),
]);

const responseSchema = z.object({ id: z.string(), output: z.array(outputItemSchema) });

type ResponsesModelOptions = {
  apiKey: string;
  model: string;
  baseUrl?: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
};

/**
 * OpenAI Responses API (`POST /v1/responses`) with function tools, called with fetch (no SDK).
 * Turns are chained with `previous_response_id`, which also carries reasoning items forward.
 * Errors carry the HTTP status only, never the key or the response body.
 */
export function createResponsesModel(options: ResponsesModelOptions): ChatModel {
  const baseUrl = (options.baseUrl ?? "https://api.openai.com/v1").replace(/\/+$/, "");
  const fetchImpl = options.fetchImpl ?? fetch;
  const timeoutMs = options.timeoutMs ?? 30_000;

  return {
    model: options.model,
    async respond(request) {
      const body = {
        model: options.model,
        instructions: request.instructions,
        input:
          typeof request.input === "string"
            ? request.input
            : request.input.map((item) => ({ type: "function_call_output", call_id: item.callId, output: item.output })),
        tools: request.tools.map((tool) => ({ type: "function", strict: true, ...tool })),
        parallel_tool_calls: false,
        previous_response_id: request.previousResponseId ?? undefined,
      };
      const response = await fetchImpl(`${baseUrl}/responses`, {
        method: "POST",
        headers: { Authorization: `Bearer ${options.apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (!response.ok) throw new Error(`Model request failed with HTTP ${response.status}`);

      const parsed = responseSchema.safeParse(await response.json());
      if (!parsed.success) throw new Error("Model response had an unexpected shape");

      const toolCalls: ToolCall[] = [];
      let text = "";
      for (const item of parsed.data.output) {
        if (item.type === "function_call" && "call_id" in item) {
          toolCalls.push({ callId: item.call_id, name: item.name, arguments: item.arguments });
        } else if (item.type === "message" && "content" in item) {
          text += item.content
            .filter((part) => part.type === "output_text")
            .map((part) => part.text ?? "")
            .join("");
        }
      }
      return { responseId: parsed.data.id, text, toolCalls };
    },
  };
}

/** The configured chat model, or null when `OPENAI_API_KEY` or `OPENAI_CHAT_MODEL` is missing. */
export function getChatModel(env: Record<string, string | undefined> = process.env): ChatModel | null {
  const apiKey = env.OPENAI_API_KEY?.trim();
  const model = env.OPENAI_CHAT_MODEL?.trim();
  if (!apiKey || !model) return null;
  return createResponsesModel({ apiKey, model, baseUrl: env.OPENAI_BASE_URL?.trim() || undefined });
}
