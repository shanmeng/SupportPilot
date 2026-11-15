import type { AgentStep, StopReason } from "@/lib/agent/run-agent";
import type { ScopeInput } from "@/lib/business/scope";
import type { EvidenceSource } from "@/types/evidence";

export type AnswerMode = "agent" | "search" | "records";

export type InvestigationInput = {
  question: string;
  scope: ScopeInput | null;
  mode: AnswerMode;
  stopReason: StopReason | null;
  answer: string | null;
  citations: EvidenceSource[];
  steps: AgentStep[];
};

export type SavedInvestigation = InvestigationInput & {
  id: string;
  ownerId: string;
  ownerName: string | null;
  createdAt: string;
};

export type InvestigationSummary = Pick<SavedInvestigation, "id" | "question" | "scope" | "stopReason" | "ownerName" | "createdAt">;

export type InvestigationPage = { items: InvestigationSummary[]; nextCursor: string | null };
