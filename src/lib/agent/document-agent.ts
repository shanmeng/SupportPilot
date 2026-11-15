import { z } from "zod";
import type { ChatModel, ToolCall, ToolOutput } from "@/lib/llm/responses-client";
import { toEvidenceSource, documentKindLabel } from "@/lib/rag/evidence";
import { toExcerpt } from "@/lib/rag/excerpt";
import type { DocumentKind } from "@/lib/rag/knowledge-document";
import type { DocumentEvidence } from "@/lib/rag/search";
import type { EvidenceSource } from "@/types/evidence";
import { AgentBudget, type BudgetLimits } from "./budget";
import {
  BUDGET_EXHAUSTED_ANSWER,
  DOCUMENT_AGENT_INSTRUCTIONS,
  DOCUMENT_TOOLS,
  MODEL_ERROR_ANSWER,
  NO_EVIDENCE_ANSWER,
  UNTRUSTED_NOTE,
} from "./prompts";

export type ReadDocumentResult = { id: string; title: string; kind: DocumentKind; content: string };

export type DocumentTools = {
  searchDocuments(query: string): Promise<DocumentEvidence[]>;
  readDocument(id: string): Promise<ReadDocumentResult | null>;
};

export type StepOutcome = "ok" | "empty" | "duplicate" | "rejected" | "error" | "budget";
export type AgentStep = { tool: string; label: string; outcome: StepOutcome };
export type StopReason = "answered" | "no_evidence" | "budget_exhausted" | "error";

export type AgentResult = {
  answer: string;
  citations: EvidenceSource[];
  stopReason: StopReason;
  steps: AgentStep[];
  /** IDs the model cited that no tool returned in this run; removed from the answer. */
  removedCitations: string[];
};

type AgentDeps = {
  model: ChatModel;
  tools: DocumentTools;
  limits?: Partial<BudgetLimits>;
  onStep?: (step: AgentStep) => void;
};

const DOC_ID = /^[A-Z][A-Z0-9]*(-[A-Z0-9]+)+$/;
const searchArgs = z.object({ query: z.string().trim().min(2).max(300) }).strict();
const readArgs = z.object({ id: z.string().regex(DOC_ID) }).strict();
const CITATION = /\[([A-Z][A-Z0-9]*(?:-[A-Z0-9]+)+)\]/g;
const MAX_READ_CHARS = 6000;

function parseArgs(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Bounded document agent (S2): the model chooses `searchDocuments` / `readDocument` within a finite
 * budget; duplicate calls are skipped; the answer keeps only citations whose IDs a tool returned
 * in this run. Without retrieved evidence, no model text is returned.
 */
export async function runDocumentAgent(question: string, deps: AgentDeps): Promise<AgentResult> {
  const budget = new AgentBudget(deps.limits);
  const steps: AgentStep[] = [];
  const evidence = new Map<string, EvidenceSource>();

  const record = (step: AgentStep) => {
    steps.push(step);
    deps.onStep?.(step);
  };

  async function runTool(call: ToolCall): Promise<string> {
    const args = parseArgs(call.arguments);
    if (call.name === "searchDocuments") {
      const parsed = searchArgs.safeParse(args);
      const label = "Searched documentation";
      if (!parsed.success) {
        record({ tool: call.name, label, outcome: "rejected" });
        return JSON.stringify({ error: "Invalid arguments: query must be 2-300 characters." });
      }
      const decision = budget.useToolCall(call.name, parsed.data);
      if (decision !== "allowed") return refuse(call.name, label, decision);
      try {
        const results = await deps.tools.searchDocuments(parsed.data.query);
        for (const result of results) if (!evidence.has(result.id)) evidence.set(result.id, toEvidenceSource(result));
        record({ tool: call.name, label, outcome: results.length > 0 ? "ok" : "empty" });
        return JSON.stringify({
          note: UNTRUSTED_NOTE,
          results: results.map(({ id, title, kind, section, excerpt }) => ({ id, title, kind, section, excerpt })),
        });
      } catch {
        record({ tool: call.name, label, outcome: "error" });
        return JSON.stringify({ error: "Search failed." });
      }
    }

    if (call.name === "readDocument") {
      const parsed = readArgs.safeParse(args);
      if (!parsed.success) {
        record({ tool: call.name, label: "Read document", outcome: "rejected" });
        return JSON.stringify({ error: "Invalid arguments: id must be a document ID such as KB-API-029." });
      }
      const label = `Read ${parsed.data.id}`;
      const decision = budget.useToolCall(call.name, parsed.data);
      if (decision !== "allowed") return refuse(call.name, label, decision);
      try {
        const doc = await deps.tools.readDocument(parsed.data.id);
        if (!doc) {
          record({ tool: call.name, label, outcome: "empty" });
          return JSON.stringify({ error: `No document with ID ${parsed.data.id}.` });
        }
        if (!evidence.has(doc.id)) {
          evidence.set(doc.id, {
            id: doc.id,
            title: doc.title,
            excerpt: toExcerpt(doc.content),
            kind: "document",
            detail: documentKindLabel(doc.kind),
          });
        }
        record({ tool: call.name, label, outcome: "ok" });
        return JSON.stringify({
          note: UNTRUSTED_NOTE,
          document: { id: doc.id, title: doc.title, kind: doc.kind, content: doc.content.slice(0, MAX_READ_CHARS) },
        });
      } catch {
        record({ tool: call.name, label, outcome: "error" });
        return JSON.stringify({ error: "Reading the document failed." });
      }
    }

    record({ tool: "unknown", label: "Rejected an unknown tool", outcome: "rejected" });
    return JSON.stringify({ error: "Unknown tool. Only searchDocuments and readDocument are available." });
  }

  function refuse(tool: string, label: string, decision: "duplicate" | "exhausted"): string {
    if (decision === "duplicate") {
      record({ tool, label, outcome: "duplicate" });
      return JSON.stringify({ error: "Duplicate call skipped: you already have this result." });
    }
    record({ tool, label, outcome: "budget" });
    return JSON.stringify({ error: "Tool budget exhausted. Answer now with the evidence you already have." });
  }

  let input: string | ToolOutput[] = question;
  let previousResponseId: string | null = null;
  let finalText: string | null = null;

  while (finalText === null) {
    if (!budget.useModelCall()) {
      if (evidence.size === 0) return finish(NO_EVIDENCE_ANSWER, [], "no_evidence");
      return finish(BUDGET_EXHAUSTED_ANSWER, [...evidence.values()], "budget_exhausted");
    }
    let turn;
    try {
      turn = await deps.model.respond({
        instructions: DOCUMENT_AGENT_INSTRUCTIONS,
        input,
        tools: DOCUMENT_TOOLS,
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
    for (const call of turn.toolCalls) outputs.push({ callId: call.callId, output: await runTool(call) });
    input = outputs;
  }

  // Missing tool results must never yield a "verified" answer.
  if (evidence.size === 0 || finalText.trim() === "") return finish(NO_EVIDENCE_ANSWER, [], "no_evidence");

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

  function finish(text: string, citations: EvidenceSource[], stopReason: StopReason, removedCitations: string[] = []) {
    return { answer: text, citations, stopReason, steps, removedCitations };
  }
}
