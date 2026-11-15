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
import { importBusinessData } from "@/lib/business/importer";
import { getDb } from "@/lib/db/client";
import { businessFixtures } from "../support/business-fixtures";

const session = {
  user: { id: "8f6c1a52-0d7e-4d8a-9a43-2f7d0b1e9c11", name: "Octo", email: null, image: null, role: "engineer" },
  expires: "2099-01-01T00:00:00.000Z",
};

function scripted(turns: Partial<ModelTurn>[]) {
  let i = 0;
  const respond = vi.fn(async () => {
    const turn = turns[Math.min(i, turns.length - 1)];
    i += 1;
    return { responseId: `r${i}`, text: "", toolCalls: [], ...turn };
  });
  return { model: "fake", respond } satisfies ChatModel;
}

const call = (name: string, args: unknown) => ({ callId: `c${Math.random()}`, name, arguments: JSON.stringify(args) });

function post(body: unknown) {
  return POST(
    new Request("http://localhost/api/v1/answers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

const fullScope = { accountId: "acct_test_a", environment: "production", paymentId: "pay_test_a_0001" };

beforeAll(async () => {
  vi.stubEnv("OPENAI_API_KEY", "");
  await getDb().execute(sql`truncate table accounts cascade`);
  await importBusinessData(businessFixtures);
});

beforeEach(() => {
  authMock.mockReset();
  authMock.mockResolvedValue(session);
  chatModelMock.mockReset();
});

describe("POST /api/v1/answers with an investigation scope", () => {
  it("asks for the missing fields instead of guessing (Flow C)", async () => {
    const model = scripted([{ text: "never called" }]);
    chatModelMock.mockReturnValue(model);

    const response = await post({ question: "Why no webhook?", scope: { accountId: "acct_test_a" } });

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json).toMatchObject({ stopReason: "needs_scope", missingFields: ["environment", "payment ID"], citations: [] });
    expect(json.answer).toMatch(/environment/);
    expect(model.respond).not.toHaveBeenCalled();
  });

  it("asks for the scope when the question names a record but no scope is given", async () => {
    chatModelMock.mockReturnValue(scripted([{ text: "never called" }]));

    const json = await (await post({ question: "Why was pay_test_a_0001 not delivered?" })).json();

    expect(json.stopReason).toBe("needs_scope");
    expect(json.missingFields).toEqual(["account ID", "environment", "payment ID"]);
  });

  it("rejects a malformed scope with 400", async () => {
    const response = await post({ question: "Why?", scope: { ...fullScope, accountId: "acct' or 1=1" } });

    expect(response.status).toBe(400);
  });

  it("never reads another account's payment, even when the model asks for it", async () => {
    chatModelMock.mockReturnValue(
      scripted([
        { toolCalls: [call("getPayment", { paymentId: "pay_test_b_0001" })] },
        { text: "Payment pay_test_b_0001 failed with FP-4021 [pay_test_b_0001]." },
      ]),
    );

    const json = await (await post({ question: "What happened?", scope: fullScope })).json();

    expect(json.stopReason).toBe("no_evidence");
    expect(json.citations).toEqual([]);
    expect(json.answer).not.toContain("FP-4021");
  });

  it("answers with verified record citations for the payment in scope", async () => {
    chatModelMock.mockReturnValue(
      scripted([
        { toolCalls: [call("getPayment", { paymentId: "pay_test_a_0001" })] },
        { toolCalls: [call("listWebhookDeliveries", { paymentId: "pay_test_a_0001" })] },
        { text: "Succeeded [pay_test_a_0001]; delivery still retrying [del_test_a_0001]." },
      ]),
    );

    const json = await (await post({ question: "Why no webhook?", scope: fullScope })).json();

    expect(json.mode).toBe("agent");
    expect(json.stopReason).toBe("answered");
    expect(json.citations.map((c: { id: string; kind: string }) => `${c.kind}:${c.id}`)).toEqual([
      "record:pay_test_a_0001",
      "record:del_test_a_0001",
    ]);
  });

  it("returns the scoped records directly when no chat model is configured", async () => {
    chatModelMock.mockReturnValue(null);

    const json = await (await post({ question: "Why no webhook?", scope: fullScope })).json();

    expect(json).toMatchObject({ mode: "records", answer: null });
    expect(json.citations.map((c: { id: string }) => c.id)).toEqual([
      "pay_test_a_0001",
      "evt_test_a_0001",
      "del_test_a_0001",
    ]);
  });
});
