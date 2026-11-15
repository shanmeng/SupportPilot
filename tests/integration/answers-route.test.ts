import { sql } from "drizzle-orm";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { ChatModel, ModelTurn } from "@/lib/llm/responses-client";

const authMock = vi.hoisted(() => vi.fn());
const chatModelMock = vi.hoisted(() => vi.fn<() => ChatModel | null>());
vi.mock("@/auth", () => ({ auth: authMock }));
vi.mock("@/lib/llm/responses-client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/llm/responses-client")>()),
  getChatModel: chatModelMock,
}));

import { POST } from "@/app/api/v1/answers/route";
import { createDocumentTools } from "@/lib/agent/document-tools";
import { getDb } from "@/lib/db/client";
import { importKnowledgeFiles } from "@/lib/rag/importer";
import { loadKnowledgeFixtures } from "../support/knowledge-fixtures";

const session = {
  user: { id: "8f6c1a52-0d7e-4d8a-9a43-2f7d0b1e9c11", name: "Octo", email: null, image: null, role: "engineer" },
  expires: "2099-01-01T00:00:00.000Z",
};

function scripted(turns: Partial<ModelTurn>[]): ChatModel {
  let i = 0;
  return {
    model: "fake-model",
    async respond() {
      const turn = turns[Math.min(i, turns.length - 1)];
      i += 1;
      return { responseId: `resp_${i}`, text: "", toolCalls: [], ...turn };
    },
  };
}

function post(body: unknown) {
  return POST(
    new Request("http://localhost/api/v1/answers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

beforeAll(async () => {
  vi.stubEnv("OPENAI_API_KEY", "");
  await getDb().execute(sql`truncate table documents cascade`);
  await importKnowledgeFiles(loadKnowledgeFixtures(), { embedder: null });
});

describe("document tools (real PostgreSQL)", () => {
  it("readDocument returns the stored title, kind and full text of a real document", async () => {
    const doc = await createDocumentTools({ embedder: null }).readDocument("KB-FIX-003");

    expect(doc).toMatchObject({ id: "KB-FIX-003", title: "Tenant Isolation Rules", kind: "business_rule" });
    expect(doc?.content).toContain("FP-ACCESS-403");
  });

  it("readDocument returns null for an unknown ID", async () => {
    await expect(createDocumentTools({ embedder: null }).readDocument("KB-NOPE-001")).resolves.toBeNull();
  });
});

describe("POST /api/v1/answers", () => {
  beforeEach(() => {
    authMock.mockReset();
    authMock.mockResolvedValue(session);
    chatModelMock.mockReset();
  });

  it("returns 401 when signed out", async () => {
    authMock.mockResolvedValue(null);

    const response = await post({ question: "webhook 410" });

    expect(response.status).toBe(401);
  });

  it("returns 400 for an invalid question", async () => {
    const response = await post({ question: "a" });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ error: { code: "invalid_request" } });
  });

  it("falls back to search-only results when no chat model is configured", async () => {
    chatModelMock.mockReturnValue(null);

    const response = await post({ question: "HTTP 410 gone endpoint" });

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json).toMatchObject({ mode: "search", answer: null, stopReason: null, steps: [] });
    expect(json.citations[0]).toMatchObject({ id: "KB-FIX-001", kind: "document" });
  });

  it("runs the agent with real tools and returns only verified citations", async () => {
    chatModelMock.mockReturnValue(
      scripted([
        { toolCalls: [{ callId: "c1", name: "searchDocuments", arguments: '{"query":"HTTP 410 gone endpoint"}' }] },
        { text: "The endpoint is disabled after HTTP 410 [KB-FIX-001]. Also [KB-INVENTED-001]." },
      ]),
    );

    const response = await post({ question: "What happens after HTTP 410?" });

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.mode).toBe("agent");
    expect(json.stopReason).toBe("answered");
    expect(json.citations.map((c: { id: string }) => c.id)).toEqual(["KB-FIX-001"]);
    expect(json.answer).not.toContain("KB-INVENTED-001");
    expect(json.steps).toEqual([{ tool: "searchDocuments", label: "Searched documentation", outcome: "ok" }]);
  });
});
