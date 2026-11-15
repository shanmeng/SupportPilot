import { toEvidenceSource } from "@/lib/rag/evidence";
import type { DocumentEvidence } from "@/lib/rag/search";
import type { EvidenceSource } from "@/types/evidence";

export type AskResult = { sources: EvidenceSource[] };

const UNAVAILABLE = "Search is unavailable right now. Try again.";

/** Browser client for `POST /api/v1/search`. Errors carry a message that is safe to show to the user. */
export async function askDocumentation(question: string, fetchImpl: typeof fetch = fetch): Promise<AskResult> {
  let response: Response;
  try {
    response = await fetchImpl("/api/v1/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: question, limit: 5 }),
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

  const body = (await response.json()) as { results: DocumentEvidence[] };
  return { sources: body.results.map(toEvidenceSource) };
}
