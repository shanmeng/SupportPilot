export type BudgetLimits = { maxModelCalls: number; maxToolCalls: number };

export type ToolCallDecision = "allowed" | "duplicate" | "exhausted";

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

/** Finite model/tool budgets for one agent run, with order-independent duplicate detection. */
export class AgentBudget {
  readonly limits: BudgetLimits;
  modelCallsUsed = 0;
  toolCallsUsed = 0;
  private readonly seen = new Set<string>();

  constructor(limits: Partial<BudgetLimits> = {}) {
    this.limits = { maxModelCalls: limits.maxModelCalls ?? 5, maxToolCalls: limits.maxToolCalls ?? 3 };
  }

  useModelCall(): boolean {
    if (this.modelCallsUsed >= this.limits.maxModelCalls) return false;
    this.modelCallsUsed += 1;
    return true;
  }

  /** Duplicates are detected first and do not spend budget. */
  useToolCall(name: string, args: unknown): ToolCallDecision {
    const key = `${name}:${stableStringify(args)}`;
    if (this.seen.has(key)) return "duplicate";
    if (this.toolCallsUsed >= this.limits.maxToolCalls) return "exhausted";
    this.seen.add(key);
    this.toolCallsUsed += 1;
    return "allowed";
  }
}
