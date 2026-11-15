import { describe, expect, it, vi } from "vitest";
import type { DocumentTools } from "@/lib/agent/document-agent";
import { INVESTIGATION_TOOLS, runInvestigationAgent, type BusinessTools } from "@/lib/agent/investigation-agent";
import type { ChatModel, ModelRequest, ModelTurn } from "@/lib/llm/responses-client";

const scope = { accountId: "acct_test_a", environment: "production" as const, paymentId: "pay_test_a_0001" };

const payment = {
  id: "pay_test_a_0001",
  status: "succeeded",
  amount: 357513,
  currency: "USD",
  failureCode: null,
  failureCategory: null,
  createdAt: "2025-10-25T00:07:10.000Z",
  succeededAt: "2025-10-25T00:07:10.000Z",
};
const delivery = {
  id: "del_test_a_0001",
  eventId: "evt_test_a_0001",
  status: "retrying",
  attemptCount: 1,
  lastAttemptAt: "2025-10-25T00:07:10.004Z",
  nextAttemptAt: "2025-10-25T00:08:10.004Z",
  deliveredAt: null,
  terminalReason: null,
  endpointId: "we_test_a_01",
  endpointStatus: "enabled",
  endpointHost: "hooks.a.example.test",
};

function scriptedModel(turns: Partial<ModelTurn>[]): ChatModel & { requests: ModelRequest[] } {
  const requests: ModelRequest[] = [];
  let i = 0;
  return {
    model: "fake",
    requests,
    async respond(request) {
      requests.push(request);
      const turn = turns[Math.min(i, turns.length - 1)];
      i += 1;
      return { responseId: `r${i}`, text: "", toolCalls: [], ...turn };
    },
  };
}

const call = (name: string, args: unknown) => ({ callId: `c_${name}_${Math.random()}`, name, arguments: JSON.stringify(args) });

function businessTools(overrides: Partial<BusinessTools> = {}): BusinessTools {
  return {
    getPayment: vi.fn().mockResolvedValue(payment),
    listPaymentEvents: vi.fn().mockResolvedValue([
      { id: "evt_test_a_0001", eventType: "payment.succeeded", objectId: "pay_test_a_0001", occurredAt: "2025-10-25T00:07:10.001Z" },
    ]),
    listWebhookDeliveries: vi.fn().mockResolvedValue([delivery]),
    ...overrides,
  };
}

const documentTools: DocumentTools = {
  searchDocuments: vi.fn().mockResolvedValue([]),
  readDocument: vi.fn().mockResolvedValue(null),
};

describe("runInvestigationAgent", () => {
  it("gives the model no way to choose the account or environment", () => {
    for (const tool of INVESTIGATION_TOOLS) {
      const properties = Object.keys((tool.parameters as { properties: object }).properties);
      expect(properties).not.toContain("accountId");
      expect(properties).not.toContain("environment");
    }
  });

  it("tells the model the fixed scope and cites verified record IDs", async () => {
    const model = scriptedModel([
      { toolCalls: [call("getPayment", { paymentId: "pay_test_a_0001" })] },
      { toolCalls: [call("listWebhookDeliveries", { paymentId: "pay_test_a_0001" })] },
      { text: "The payment succeeded [pay_test_a_0001] but its delivery is still retrying [del_test_a_0001]." },
    ]);

    const result = await runInvestigationAgent("Why no webhook?", scope, {
      model,
      businessTools: businessTools(),
      documentTools,
    });

    expect(model.requests[0].input).toContain("acct_test_a");
    expect(model.requests[0].input).toContain("production");
    expect(result.stopReason).toBe("answered");
    expect(result.citations.map((c) => [c.id, c.kind])).toEqual([
      ["pay_test_a_0001", "record"],
      ["del_test_a_0001", "record"],
    ]);
    expect(result.citations[0]).toMatchObject({
      title: "Payment pay_test_a_0001",
      excerpt: "succeeded · 3,575.13 USD · created 2025-10-25",
      detail: "Payment · acct_test_a · production",
    });
    expect(result.citations[1].excerpt).toContain("retrying");
    expect(result.citations[1].excerpt).toContain("we_test_a_01");
  });

  it("removes record IDs that no tool returned", async () => {
    const model = scriptedModel([
      { toolCalls: [call("getPayment", { paymentId: "pay_test_a_0001" })] },
      { text: "Succeeded [pay_test_a_0001]; compare with [pay_test_b_0001]." },
    ]);

    const result = await runInvestigationAgent("?", scope, { model, businessTools: businessTools(), documentTools });

    expect(result.citations.map((c) => c.id)).toEqual(["pay_test_a_0001"]);
    expect(result.removedCitations).toEqual(["pay_test_b_0001"]);
  });

  it("says the payment was not found in this account when no record matched", async () => {
    const model = scriptedModel([
      { toolCalls: [call("getPayment", { paymentId: "pay_test_b_0001" })] },
      { text: "It probably failed." },
    ]);
    const tools = businessTools({ getPayment: vi.fn().mockResolvedValue(null) });

    const result = await runInvestigationAgent("?", scope, { model, businessTools: tools, documentTools });

    expect(result.stopReason).toBe("no_evidence");
    expect(result.citations).toEqual([]);
    expect(result.answer).toContain("acct_test_a");
    expect(result.answer).toMatch(/not found/i);
    expect(result.answer).toMatch(/other accounts/i);
    expect(result.answer).not.toContain("probably");
  });

  it("rejects malformed record IDs before calling a tool", async () => {
    const model = scriptedModel([
      { toolCalls: [call("getPayment", { paymentId: "1 or 1=1" })] },
      { text: "Done." },
    ]);
    const tools = businessTools();

    const result = await runInvestigationAgent("?", scope, { model, businessTools: tools, documentTools });

    expect(tools.getPayment).not.toHaveBeenCalled();
    expect(result.steps[0].outcome).toBe("rejected");
  });

  it("allows a larger budget than documentation questions (several record lookups plus docs)", async () => {
    const model = scriptedModel([
      { toolCalls: [call("getPayment", { paymentId: "pay_test_a_0001" })] },
      { toolCalls: [call("listPaymentEvents", { paymentId: "pay_test_a_0001" })] },
      { toolCalls: [call("listWebhookDeliveries", { paymentId: "pay_test_a_0001" })] },
      { toolCalls: [call("searchDocuments", { query: "webhook retrying" })] },
      { text: "Retrying [del_test_a_0001]." },
    ]);

    const result = await runInvestigationAgent("?", scope, { model, businessTools: businessTools(), documentTools });

    expect(result.steps.map((s) => s.outcome)).not.toContain("budget");
    expect(result.stopReason).toBe("answered");
  });
});
