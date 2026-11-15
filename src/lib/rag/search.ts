import "server-only";
import { z } from "zod";
import { searchKnowledgeChunks } from "@/lib/db/knowledge-repository";
import type { Embedder } from "./embedder";
import { toExcerpt } from "./excerpt";
import type { DocumentAuthority, DocumentKind } from "./knowledge-document";

export const searchRequestSchema = z.object({
  query: z
    .string({ error: "query must be a string" })
    .trim()
    .min(2, "query must be 2-500 characters")
    .max(500, "query must be 2-500 characters"),
  limit: z
    .number({ error: "limit must be an integer from 1 to 10" })
    .int("limit must be an integer from 1 to 10")
    .min(1, "limit must be an integer from 1 to 10")
    .max(10, "limit must be an integer from 1 to 10")
    .default(5),
});

export type SearchRequest = z.infer<typeof searchRequestSchema>;

/** One piece of documentation evidence. Every field comes from stored data, never from a model. */
export type DocumentEvidence = {
  id: string;
  chunkId: string;
  title: string;
  kind: DocumentKind;
  authority: DocumentAuthority;
  section: string;
  excerpt: string;
  score: number;
};

export type SearchResponse = { mode: "hybrid" | "keyword"; results: DocumentEvidence[] };

const MAX_KEYWORDS = 32;

/**
 * Reduces free text to OR-ed words for `websearch_to_tsquery`, so the query never depends on
 * user-supplied operators or quotes. Hyphenated identifiers (FP-ACCESS-403, KB-API-029) stay whole.
 */
export function toKeywordQuery(query: string): string {
  const words = query.toLowerCase().match(/[\p{L}\p{N}]+(?:[-_][\p{L}\p{N}]+)*/gu) ?? [];
  return words
    .filter((word) => word !== "or")
    .slice(0, MAX_KEYWORDS)
    .join(" or ");
}

type SearchDeps = {
  embedder: Embedder | null;
  /** Cosine similarity below which vector hits are ignored. */
  minSimilarity?: number;
  onEmbeddingError?: (error: unknown) => void;
};

export async function searchDocuments(request: SearchRequest, deps: SearchDeps): Promise<SearchResponse> {
  let embedding: number[] | null = null;
  if (deps.embedder) {
    try {
      [embedding] = await deps.embedder.embed([request.query]);
    } catch (error) {
      // Degrade to keyword search rather than failing the request.
      (deps.onEmbeddingError ?? ((e) => console.warn("Query embedding failed; using keyword search.", e)))(error);
      embedding = null;
    }
  }
  if (embedding && embedding.every((value) => value === 0)) embedding = null;

  const hits = await searchKnowledgeChunks({
    keywords: toKeywordQuery(request.query),
    embedding,
    embeddingModel: embedding ? (deps.embedder?.model ?? null) : null,
    minSimilarity: deps.minSimilarity ?? 0.3,
    candidates: Math.max(20, request.limit * 4),
  });

  const seen = new Set<string>();
  const results: DocumentEvidence[] = [];
  for (const hit of hits) {
    if (seen.has(hit.documentId)) continue;
    seen.add(hit.documentId);
    results.push({
      id: hit.documentId,
      chunkId: hit.chunkId,
      title: hit.title,
      kind: hit.kind,
      authority: hit.authority,
      section: hit.section,
      excerpt: toExcerpt(hit.content),
      score: hit.score,
    });
    if (results.length === request.limit) break;
  }
  return { mode: embedding ? "hybrid" : "keyword", results };
}
