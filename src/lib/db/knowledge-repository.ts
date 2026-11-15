import "server-only";
import { eq, sql } from "drizzle-orm";
import type { DocumentAuthority, DocumentKind, KnowledgeDocument } from "@/lib/rag/knowledge-document";
import { getDb } from "./client";
import { documentChunks, documents } from "./schema";

export type ChunkInput = { index: number; section: string; content: string; embedding: number[] | null };

export type ImportState = { contentHash: string; embeddingModel: string | null };

export type SearchHit = {
  chunkId: string;
  documentId: string;
  title: string;
  kind: DocumentKind;
  authority: DocumentAuthority;
  section: string;
  content: string;
  score: number;
};

export type SearchParams = {
  /** OR-ed keywords for `websearch_to_tsquery`; empty string disables keyword matching. */
  keywords: string;
  /** Query embedding; null disables vector matching. */
  embedding: number[] | null;
  embeddingModel: string | null;
  /** Vector hits below this cosine similarity are ignored, so unrelated questions return nothing. */
  minSimilarity: number;
  candidates: number;
};

/** Reciprocal rank fusion constant (standard value). */
const RRF_K = 60;

export function chunkId(documentId: string, index: number): string {
  return `${documentId}#c${String(index + 1).padStart(3, "0")}`;
}

export async function getImportState(documentId: string): Promise<ImportState | null> {
  const [row] = await getDb()
    .select({
      contentHash: documents.contentHash,
      // Explicit table names: Drizzle renders interpolated columns unqualified inside raw SQL,
      // which would make `id` resolve to document_chunks.id in this subquery.
      embeddingModel: sql<string | null>`(select dc.embedding_model from document_chunks dc
        where dc.document_id = "documents"."id" order by dc.chunk_index limit 1)`,
    })
    .from(documents)
    .where(eq(documents.id, documentId));
  return row ?? null;
}

/** Inserts or updates a document and replaces all of its chunks in one transaction. */
export async function replaceKnowledgeDocument(
  doc: KnowledgeDocument,
  chunks: ChunkInput[],
  embeddingModel: string | null,
): Promise<void> {
  const values = {
    id: doc.id,
    title: doc.title,
    kind: doc.kind,
    authority: doc.authority,
    language: doc.language,
    productAreas: doc.productAreas,
    ruleIds: doc.ruleIds,
    effectiveFrom: doc.effectiveFrom,
    effectiveTo: doc.effectiveTo,
    sourcePath: doc.sourcePath,
    contentHash: doc.contentHash,
    updatedAt: new Date(),
  };
  await getDb().transaction(async (tx) => {
    await tx.insert(documents).values(values).onConflictDoUpdate({ target: documents.id, set: values });
    await tx.delete(documentChunks).where(eq(documentChunks.documentId, doc.id));
    if (chunks.length === 0) return;
    await tx.insert(documentChunks).values(
      chunks.map((chunk) => ({
        id: chunkId(doc.id, chunk.index),
        documentId: doc.id,
        chunkIndex: chunk.index,
        section: chunk.section,
        content: chunk.content,
        embedding: chunk.embedding,
        embeddingModel: chunk.embedding ? embeddingModel : null,
      })),
    );
  });
}

/**
 * Hybrid retrieval: full-text matches and vector neighbours (above `minSimilarity`) are fused with
 * reciprocal rank fusion. Either side can be disabled. All inputs are bound parameters.
 */
export async function searchKnowledgeChunks(params: SearchParams): Promise<SearchHit[]> {
  const useKeywords = params.keywords.length > 0;
  const useVector = params.embedding !== null && params.embeddingModel !== null;
  if (!useKeywords && !useVector) return [];

  const keywordCte = useKeywords
    ? sql`select c.id, row_number() over (order by ts_rank_cd(c.search_vector, q.query) desc, c.id) as rn
          from document_chunks c, websearch_to_tsquery('english', ${params.keywords}) as q(query)
          where c.search_vector @@ q.query
          order by rn limit ${params.candidates}`
    : sql`select null::text as id, null::bigint as rn where false`;

  const vectorLiteral = useVector ? JSON.stringify(params.embedding) : null;
  const vectorCte = useVector
    ? sql`select id, row_number() over (order by distance, id) as rn from (
            select c.id, c.embedding <=> ${vectorLiteral}::vector as distance
            from document_chunks c
            where c.embedding is not null and c.embedding_model = ${params.embeddingModel}
            order by distance limit ${params.candidates}
          ) nearest
          where 1 - distance >= ${params.minSimilarity}`
    : sql`select null::text as id, null::bigint as rn where false`;

  const rows = await getDb().execute<{
    chunk_id: string;
    document_id: string;
    title: string;
    kind: DocumentKind;
    authority: DocumentAuthority;
    section: string;
    content: string;
    score: number;
  }>(sql`
    with keyword_hits as (${keywordCte}),
         vector_hits as (${vectorCte}),
         fused as (
           select id, sum(1.0 / (${RRF_K} + rn))::float8 as score
           from (select id, rn from keyword_hits union all select id, rn from vector_hits) ranked
           group by id
         )
    select c.id as chunk_id, c.document_id, d.title, d.kind, d.authority, c.section, c.content, f.score
    from fused f
    join document_chunks c on c.id = f.id
    join documents d on d.id = c.document_id
    order by f.score desc, c.id
    limit ${params.candidates}`);

  return rows.map((row) => ({
    chunkId: row.chunk_id,
    documentId: row.document_id,
    title: row.title,
    kind: row.kind,
    authority: row.authority,
    section: row.section,
    content: row.content,
    score: Number(row.score),
  }));
}
