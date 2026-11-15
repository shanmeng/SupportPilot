import { NextResponse } from "next/server";
import { apiError } from "@/lib/api/errors";
import { requireApiUser } from "@/lib/auth/session";
import { getQueryEmbedder } from "@/lib/rag/embedder";
import { searchDocuments, searchRequestSchema } from "@/lib/rag/search";

/**
 * Searches the knowledge base and returns documentation evidence (real document IDs, titles,
 * kinds and excerpts). Signed-in users only.
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

  const parsed = searchRequestSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(400, "invalid_request", parsed.error.issues.map((issue) => issue.message).join("; "));
  }

  const result = await searchDocuments(parsed.data, { embedder: getQueryEmbedder() });
  return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
}
