import { NextResponse } from "next/server";
import { z } from "zod";
import { runDocumentAgent } from "@/lib/agent/document-agent";
import { createDocumentTools } from "@/lib/agent/document-tools";
import { apiError } from "@/lib/api/errors";
import { requireApiUser } from "@/lib/auth/session";
import { getChatModel } from "@/lib/llm/responses-client";
import { getQueryEmbedder } from "@/lib/rag/embedder";
import { toEvidenceSource } from "@/lib/rag/evidence";
import { searchDocuments } from "@/lib/rag/search";

const answerRequestSchema = z.object({
  question: z
    .string({ error: "question must be a string" })
    .trim()
    .min(2, "question must be 2-500 characters")
    .max(500, "question must be 2-500 characters"),
});

/**
 * Answers a documentation question with the bounded agent and verified citations.
 * Without a configured chat model it returns search results only (`mode: "search"`).
 */
export async function POST(request: Request) {
  const { response } = await requireApiUser();
  if (response) return response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError(400, "invalid_request", "Request body must be JSON.");
  }
  const parsed = answerRequestSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(400, "invalid_request", parsed.error.issues.map((issue) => issue.message).join("; "));
  }

  const embedder = getQueryEmbedder();
  const model = getChatModel();
  const headers = { "Cache-Control": "no-store" };

  if (!model) {
    const { results } = await searchDocuments({ query: parsed.data.question, limit: 5 }, { embedder });
    return NextResponse.json(
      { mode: "search", answer: null, stopReason: null, steps: [], removedCitations: [], citations: results.map(toEvidenceSource) },
      { headers },
    );
  }

  const result = await runDocumentAgent(parsed.data.question, { model, tools: createDocumentTools({ embedder }) });
  return NextResponse.json({ mode: "agent", ...result }, { headers });
}
