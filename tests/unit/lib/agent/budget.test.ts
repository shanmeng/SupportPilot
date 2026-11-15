import { describe, expect, it } from "vitest";
import { AgentBudget } from "@/lib/agent/budget";

describe("AgentBudget", () => {
  it("allows at most the configured number of model calls", () => {
    const budget = new AgentBudget({ maxModelCalls: 2, maxToolCalls: 3 });

    expect(budget.useModelCall()).toBe(true);
    expect(budget.useModelCall()).toBe(true);
    expect(budget.useModelCall()).toBe(false);
    expect(budget.modelCallsUsed).toBe(2);
  });

  it("allows at most the configured number of tool calls", () => {
    const budget = new AgentBudget({ maxModelCalls: 5, maxToolCalls: 2 });

    expect(budget.useToolCall("searchDocuments", { query: "a" })).toBe("allowed");
    expect(budget.useToolCall("searchDocuments", { query: "b" })).toBe("allowed");
    expect(budget.useToolCall("searchDocuments", { query: "c" })).toBe("exhausted");
    expect(budget.toolCallsUsed).toBe(2);
  });

  it("detects duplicate tool calls regardless of key order, without spending budget", () => {
    const budget = new AgentBudget({ maxModelCalls: 5, maxToolCalls: 3 });

    expect(budget.useToolCall("readDocument", { id: "KB-1", extra: 1 })).toBe("allowed");
    expect(budget.useToolCall("readDocument", { extra: 1, id: "KB-1" })).toBe("duplicate");
    expect(budget.toolCallsUsed).toBe(1);
  });

  it("treats the same arguments for different tools as different calls", () => {
    const budget = new AgentBudget({ maxModelCalls: 5, maxToolCalls: 3 });

    expect(budget.useToolCall("searchDocuments", { q: "x" })).toBe("allowed");
    expect(budget.useToolCall("readDocument", { q: "x" })).toBe("allowed");
  });

  it("defaults to 5 model calls and 3 tool calls", () => {
    const budget = new AgentBudget();

    expect(budget.limits).toEqual({ maxModelCalls: 5, maxToolCalls: 3 });
  });
});
