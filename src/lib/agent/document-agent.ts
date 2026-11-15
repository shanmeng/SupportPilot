import { z } from "zod";
import type { ChatModel } from "@/lib/llm/responses-client";
import { documentKindLabel, toEvidenceSource } from "@/lib/rag/evidence";
import { toExcerpt } from "@/lib/rag/excerpt";
import type { DocumentKind } from "@/lib/rag/knowledge-document";
import type { DocumentEvidence } from "@/lib/rag/search";
import type { BudgetLimits } from "./budget";
import { DOCUMENT_AGENT_INSTRUCTIONS, DOCUMENT_TOOLS, NO_EVIDENCE_ANSWER } from "./prompts";
import { runAgent, type AgentResult, type AgentStep, type AgentTool } from "./run-agent";

export type { AgentResult, AgentStep, StepOutcome, StopReason } from "./run-agent";

export type ReadDocumentResult = { id: string; title: string; kind: DocumentKind; content: string };

export type DocumentTools = {
  searchDocuments(query: string): Promise<DocumentEvidence[]>;
  readDocument(id: string): Promise<ReadDocumentResult | null>;
};

const DOC_ID = /^[A-Z][A-Z0-9]*(-[A-Z0-9]+)+$/;
const MAX_READ_CHARS = 6000;
const [searchDefinition, readDefinition] = DOCUMENT_TOOLS;

/** `searchDocuments` and `readDocument` as agent tools. */
export function documentAgentTools(tools: DocumentTools): [AgentTool<{ query: string }>, AgentTool<{ id: string }>] {
  return [
    {
      definition: searchDefinition,
      schema: z.object({ query: z.string().trim().min(2).max(300) }).strict(),
      label: () => "Searched documentation",
      invalidLabel: "Searched documentation",
      invalidMessage: "Invalid arguments: query must be 2-300 characters.",
      failureMessage: "Search failed.",
      async run({ query }) {
        const results = await tools.searchDocuments(query);
        return {
          outcome: results.length > 0 ? "ok" : "empty",
          evidence: results.map(toEvidenceSource),
          output: { results: results.map(({ id, title, kind, section, excerpt }) => ({ id, title, kind, section, excerpt })) },
        };
      },
    },
    {
      definition: readDefinition,
      schema: z.object({ id: z.string().regex(DOC_ID) }).strict(),
      label: ({ id }) => `Read ${id}`,
      invalidLabel: "Read document",
      invalidMessage: "Invalid arguments: id must be a document ID such as KB-API-029.",
      failureMessage: "Reading the document failed.",
      async run({ id }) {
        const doc = await tools.readDocument(id);
        if (!doc) return { outcome: "empty", evidence: [], output: { error: `No document with ID ${id}.` } };
        return {
          outcome: "ok",
          evidence: [
            { id: doc.id, title: doc.title, excerpt: toExcerpt(doc.content), kind: "document", detail: documentKindLabel(doc.kind) },
          ],
          output: { document: { id: doc.id, title: doc.title, kind: doc.kind, content: doc.content.slice(0, MAX_READ_CHARS) } },
        };
      },
    },
  ];
}

type AgentDeps = {
  model: ChatModel;
  tools: DocumentTools;
  limits?: Partial<BudgetLimits>;
  onStep?: (step: AgentStep) => void;
};

/** Bounded document agent (S2) for documentation questions. */
export function runDocumentAgent(question: string, deps: AgentDeps): Promise<AgentResult> {
  return runAgent({
    model: deps.model,
    tools: documentAgentTools(deps.tools),
    instructions: DOCUMENT_AGENT_INSTRUCTIONS,
    input: question,
    noEvidenceAnswer: NO_EVIDENCE_ANSWER,
    limits: deps.limits,
    onStep: deps.onStep,
  });
}
