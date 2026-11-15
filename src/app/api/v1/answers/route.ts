import { NextResponse } from "next/server";
import { z } from "zod";
import { createBusinessTools } from "@/lib/agent/business-tools";
import { runDocumentAgent } from "@/lib/agent/document-agent";
import { createDocumentTools } from "@/lib/agent/document-tools";
import { runInvestigationAgent } from "@/lib/agent/investigation-agent";
import { apiError } from "@/lib/api/errors";
import { requireApiUser } from "@/lib/auth/session";
import { deliveryEvidence, eventEvidence, paymentEvidence } from "@/lib/business/evidence";
import { mentionsRecordId, missingScopeFields, scopeInputSchema, type InvestigationScope } from "@/lib/business/scope";
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
  scope: scopeInputSchema.optional(),
});

const headers = { "Cache-Control": "no-store" };

/**
 * Answers a question. Without a scope: documentation agent (or search-only without a model).
 * With a scope (account + environment + payment): read-only investigation bound to that scope.
 * A partial scope, or a question that names a record without one, gets the missing fields back (Flow C).
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
  const { question, scope } = parsed.data;
  const embedder = getQueryEmbedder();
  const model = getChatModel();
  const documentTools = createDocumentTools({ embedder });

  if (scope || mentionsRecordId(question)) {
    const missingFields = missingScopeFields(scope ?? {});
    if (missingFields.length > 0) {
      return NextResponse.json(
        {
          mode: model ? "agent" : "records",
          answer: `To investigate a payment I need the ${missingFields.join(", ")}. I won't guess them or look in other accounts.`,
          stopReason: "needs_scope",
          missingFields,
          steps: [],
          removedCitations: [],
          citations: [],
        },
        { headers },
      );
    }
    const fullScope = scope as InvestigationScope;
    const businessTools = createBusinessTools(fullScope);

    if (!model) {
      const payment = await businessTools.getPayment(fullScope.paymentId);
      const events = payment ? await businessTools.listPaymentEvents(fullScope.paymentId) : [];
      const deliveries = payment ? await businessTools.listWebhookDeliveries(fullScope.paymentId) : [];
      const citations = payment
        ? [
            paymentEvidence(payment, fullScope),
            ...events.map((event) => eventEvidence(event, fullScope)),
            ...deliveries.map((delivery) => deliveryEvidence(delivery, fullScope)),
          ]
        : [];
      return NextResponse.json(
        { mode: "records", answer: null, stopReason: null, steps: [], removedCitations: [], citations },
        { headers },
      );
    }

    const result = await runInvestigationAgent(question, fullScope, { model, businessTools, documentTools });
    return NextResponse.json({ mode: "agent", ...result }, { headers });
  }

  if (!model) {
    const { results } = await searchDocuments({ query: question, limit: 5 }, { embedder });
    return NextResponse.json(
      { mode: "search", answer: null, stopReason: null, steps: [], removedCitations: [], citations: results.map(toEvidenceSource) },
      { headers },
    );
  }

  const result = await runDocumentAgent(question, { model, tools: documentTools });
  return NextResponse.json({ mode: "agent", ...result }, { headers });
}
