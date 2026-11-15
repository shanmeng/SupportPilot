import type { z } from "zod";
import type { ChatModel, ToolDefinition, ToolOutput } from "@/lib/llm/responses-client";
import type { EvidenceSource } from "@/types/evidence";
import { AgentBudget, type BudgetLimits } from "./budget";
import { BUDGET_EXHAUSTED_ANSWER, MODEL_ERROR_ANSWER, UNTRUSTED_NOTE } from "./prompts";

export type StepOutcome = "ok" | "empty" | "duplicate" | "rejected" | "error" | "budget";
export type AgentStep = { tool: string; label: string; outcome: StepOutcome };
export type StopReason = "answered" | "no_evidence" | "budget_exhausted" | "error" | "needs_scope";

export type AgentResult = {
  answer: string;
  citations: EvidenceSource[];
  stopReason: StopReason;
  steps: AgentStep[];
  /** IDs the model cited that no tool returned in this run; removed from the answer. */
  removedCitations: string[];
};

export type ToolRunResult = {
  outcome: "ok" | "empty";
  /** Sources this call proved exist; only these may be cited. */
  evidence: EvidenceSource[];
  /** Sent to the model. An `error` key means no data. */
  output: Record<string, unknown>;
};

export type AgentTool<A = never> = {
  definition: ToolDefinition;
  schema: z.ZodType<A>;
  label(args: A): string;
  invalidLabel: string;
  invalidMessage: string;
  failureMessage: string;
  run(args: A): Promise<ToolRunResult>;
};

type RunAgentOptions = {
  model: ChatModel;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- heterogeneous tool registry; each tool validates its own args
  tools: AgentTool<any>[];
  instructions: string;
  input: string;
  noEvidenceAnswer: string;
  limits?: Partial<BudgetLimits>;
  onStep?: (step: AgentStep) => void;
};

/** Document IDs (KB-API-029) and business record IDs (pay_…, evt_…, del_…, we_…, acct_…). */
const CITATION = /\[((?:[A-Z][A-Z0-9]*(?:-[A-Z0-9]+)+)|(?:(?:acct|pay|evt|del|we)_[a-z0-9_]+))\]/g;

function parseArgs(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Bounded tool-using agent loop. Tools are allowlisted; arguments are validated before any tool runs;
 * duplicates are skipped; model and tool calls are budgeted. The final answer keeps only citations
 * whose IDs a tool returned in this run, and no model text is returned without retrieved evidence.
 */
export async function runAgent(options: RunAgentOptions): Promise<AgentResult> {
  const budget = new AgentBudget(options.limits);
  const steps: AgentStep[] = [];
  const evidence = new Map<string, EvidenceSource>();
  const tools = new Map(options.tools.map((tool) => [tool.definition.name, tool]));

  const finish = (answer: string, citations: EvidenceSource[], stopReason: StopReason, removedCitations: string[] = []) => ({
    answer,
    citations,
    stopReason,
    steps,
    removedCitations,
  });

  const record = (step: AgentStep) => {
    steps.push(step);
    options.onStep?.(step);
  };

  async function callTool(name: string, rawArgs: string): Promise<string> {
    const tool = tools.get(name);
    if (!tool) {
      record({ tool: "unknown", label: "Rejected an unknown tool", outcome: "rejected" });
      return JSON.stringify({ error: `Unknown tool. Available: ${[...tools.keys()].join(", ")}.` });
    }
    const parsed = tool.schema.safeParse(parseArgs(rawArgs));
    if (!parsed.success) {
      record({ tool: name, label: tool.invalidLabel, outcome: "rejected" });
      return JSON.stringify({ error: tool.invalidMessage });
    }
    const label = tool.label(parsed.data);
    const decision = budget.useToolCall(name, parsed.data);
    if (decision === "duplicate") {
      record({ tool: name, label, outcome: "duplicate" });
      return JSON.stringify({ error: "Duplicate call skipped: you already have this result." });
    }
    if (decision === "exhausted") {
      record({ tool: name, label, outcome: "budget" });
      return JSON.stringify({ error: "Tool budget exhausted. Answer now with the evidence you already have." });
    }
    try {
      const result = await tool.run(parsed.data);
      for (const source of result.evidence) if (!evidence.has(source.id)) evidence.set(source.id, source);
      record({ tool: name, label, outcome: result.outcome });
      return JSON.stringify("error" in result.output ? result.output : { note: UNTRUSTED_NOTE, ...result.output });
    } catch {
      record({ tool: name, label, outcome: "error" });
      return JSON.stringify({ error: tool.failureMessage });
    }
  }

  const definitions = options.tools.map((tool) => tool.definition);
  let input: string | ToolOutput[] = options.input;
  let previousResponseId: string | null = null;
  let finalText = "";

  for (;;) {
    if (!budget.useModelCall()) {
      if (evidence.size === 0) return finish(options.noEvidenceAnswer, [], "no_evidence");
      return finish(BUDGET_EXHAUSTED_ANSWER, [...evidence.values()], "budget_exhausted");
    }
    let turn;
    try {
      turn = await options.model.respond({
        instructions: options.instructions,
        input,
        tools: definitions,
        previousResponseId,
      });
    } catch {
      return finish(MODEL_ERROR_ANSWER, [], "error");
    }
    previousResponseId = turn.responseId;
    if (turn.toolCalls.length === 0) {
      finalText = turn.text;
      break;
    }
    const outputs: ToolOutput[] = [];
    for (const call of turn.toolCalls) outputs.push({ callId: call.callId, output: await callTool(call.name, call.arguments) });
    input = outputs;
  }

  // Missing tool results must never yield a "verified" answer.
  if (evidence.size === 0 || finalText.trim() === "") return finish(options.noEvidenceAnswer, [], "no_evidence");

  const cited: string[] = [];
  const removed: string[] = [];
  const answer = finalText
    .replace(CITATION, (marker, id: string) => {
      if (evidence.has(id)) {
        if (!cited.includes(id)) cited.push(id);
        return marker;
      }
      if (!removed.includes(id)) removed.push(id);
      return "";
    })
    .replace(/[ \t]+([.,;:])/g, "$1")
    .replace(/[ \t]{2,}/g, " ")
    .trim();

  return finish(answer, cited.map((id) => evidence.get(id) as EvidenceSource), "answered", removed);
}
