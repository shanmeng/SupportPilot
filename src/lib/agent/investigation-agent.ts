import { z } from "zod";
import {
  deliveryEvidence,
  endpointEvidence,
  eventEvidence,
  paymentEvidence,
} from "@/lib/business/evidence";
import { PAYMENT_ID, type InvestigationScope } from "@/lib/business/scope";
import type { DeliveryRecord, EventRecord, PaymentRecord } from "@/lib/db/business-repository";
import type { ChatModel, ToolDefinition } from "@/lib/llm/responses-client";
import { documentAgentTools, type DocumentTools } from "./document-agent";
import { DOCUMENT_TOOLS, INVESTIGATION_INSTRUCTIONS, INVESTIGATION_TOOL_DEFINITIONS } from "./prompts";
import { runAgent, type AgentResult, type AgentStep, type AgentTool } from "./run-agent";

/** Business tools already bound to one account + environment by the caller. */
export type BusinessTools = {
  getPayment(paymentId: string): Promise<PaymentRecord | null>;
  listPaymentEvents(paymentId: string): Promise<EventRecord[]>;
  listWebhookDeliveries(paymentId: string): Promise<DeliveryRecord[]>;
};

/** Every tool the investigation agent can call. None takes an account or environment. */
export const INVESTIGATION_TOOLS: ToolDefinition[] = [...INVESTIGATION_TOOL_DEFINITIONS, ...DOCUMENT_TOOLS];

const paymentArgs = z.object({ paymentId: z.string().regex(PAYMENT_ID) }).strict();
const INVALID = "Invalid arguments: paymentId must look like pay_bg_001_0003.";
const [getPaymentDef, listEventsDef, listDeliveriesDef] = INVESTIGATION_TOOL_DEFINITIONS;

function businessAgentTools(tools: BusinessTools, scope: InvestigationScope): AgentTool<{ paymentId: string }>[] {
  const notFound = (id: string) => ({ error: `No record for ${id} in account ${scope.accountId} (${scope.environment}).` });
  return [
    {
      definition: getPaymentDef,
      schema: paymentArgs,
      label: ({ paymentId }) => `Read payment ${paymentId}`,
      invalidLabel: "Read payment",
      invalidMessage: INVALID,
      failureMessage: "Reading the payment failed.",
      async run({ paymentId }) {
        const payment = await tools.getPayment(paymentId);
        if (!payment) return { outcome: "empty", evidence: [], output: notFound(paymentId) };
        return { outcome: "ok", evidence: [paymentEvidence(payment, scope)], output: { payment } };
      },
    },
    {
      definition: listEventsDef,
      schema: paymentArgs,
      label: ({ paymentId }) => `Listed events for ${paymentId}`,
      invalidLabel: "Listed events",
      invalidMessage: INVALID,
      failureMessage: "Listing events failed.",
      async run({ paymentId }) {
        const events = await tools.listPaymentEvents(paymentId);
        return {
          outcome: events.length > 0 ? "ok" : "empty",
          evidence: events.map((event) => eventEvidence(event, scope)),
          output: { events },
        };
      },
    },
    {
      definition: listDeliveriesDef,
      schema: paymentArgs,
      label: ({ paymentId }) => `Listed webhook deliveries for ${paymentId}`,
      invalidLabel: "Listed webhook deliveries",
      invalidMessage: INVALID,
      failureMessage: "Listing webhook deliveries failed.",
      async run({ paymentId }) {
        const deliveries = await tools.listWebhookDeliveries(paymentId);
        return {
          outcome: deliveries.length > 0 ? "ok" : "empty",
          evidence: deliveries.flatMap((d) => [deliveryEvidence(d, scope), endpointEvidence(d, scope)]),
          output: { deliveries },
        };
      },
    },
  ];
}

type InvestigationDeps = {
  model: ChatModel;
  businessTools: BusinessTools;
  documentTools: DocumentTools;
  onStep?: (step: AgentStep) => void;
};

/** Read-only, scope-bound investigation (S3): records prove status, documents explain policy. */
export function runInvestigationAgent(
  question: string,
  scope: InvestigationScope,
  deps: InvestigationDeps,
): Promise<AgentResult> {
  const input = [
    "Investigation scope (fixed by the support engineer; you cannot change it):",
    `Account: ${scope.accountId}`,
    `Environment: ${scope.environment}`,
    `Payment: ${scope.paymentId}`,
    "",
    `Question: ${question}`,
  ].join("\n");

  return runAgent({
    model: deps.model,
    tools: [...businessAgentTools(deps.businessTools, scope), ...documentAgentTools(deps.documentTools)],
    instructions: INVESTIGATION_INSTRUCTIONS,
    input,
    noEvidenceAnswer: `Payment ${scope.paymentId} was not found in account ${scope.accountId} (${scope.environment}). I did not search other accounts or environments. Check the payment ID, account ID and environment.`,
    limits: { maxToolCalls: 6, maxModelCalls: 8 },
    onStep: deps.onStep,
  });
}
