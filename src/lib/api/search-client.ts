import type { AgentStep, StopReason } from "@/lib/agent/document-agent";
import type { EvidenceSource } from "@/types/evidence";

export type AskResult = {
  /** The agent's answer, or null in search-only mode (no chat model configured). */
  answer?: string | null;
  stopReason?: StopReason | null;
  steps?: AgentStep[];
  sources: EvidenceSource[];
};

type AnswersResponse = {
  answer: string | null;
  stopReason: StopReason | null;
  steps: AgentStep[];
  citations: EvidenceSource[];
};

const UNAVAILABLE = "Search is unavailable right now. Try again.";

/** Browser client for `POST /api/v1/answers`. Errors carry a message that is safe to show to the user. */
export async function askDocumentation(question: string, fetchImpl: typeof fetch = fetch): Promise<AskResult> {
  let response: Response;
  try {
    response = await fetchImpl("/api/v1/answers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question }),
    });
  } catch {
    throw new Error(UNAVAILABLE);
  }

  if (response.status === 401) throw new Error("Your session has expired. Sign in again.");
  if (response.status === 400) {
    const body = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(body?.error?.message ?? "That question could not be searched.");
  }
  if (!response.ok) throw new Error(UNAVAILABLE);

  const body = (await response.json()) as AnswersResponse;
  return { answer: body.answer, stopReason: body.stopReason, steps: body.steps, sources: body.citations };
}
