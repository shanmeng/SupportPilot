import type { InvestigationSummary, SavedInvestigation } from "@/lib/investigations/types";

export type HistoryClient = {
  list(): Promise<InvestigationSummary[]>;
  get(id: string): Promise<Pick<SavedInvestigation, "id" | "question" | "scope" | "answer" | "stopReason" | "steps" | "citations">>;
};

/** Browser client for the saved-investigation endpoints. */
export const historyClient: HistoryClient = {
  async list() {
    const response = await fetch("/api/v1/investigations?limit=20");
    if (!response.ok) throw new Error("Could not load recent cases.");
    return ((await response.json()) as { items: InvestigationSummary[] }).items;
  },
  async get(id) {
    const response = await fetch(`/api/v1/investigations/${encodeURIComponent(id)}`);
    if (!response.ok) throw new Error(response.status === 404 ? "This case is not available." : "Could not open the case.");
    return (await response.json()) as SavedInvestigation;
  },
};
