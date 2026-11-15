import "server-only";
import { getImportState, replaceKnowledgeDocument } from "@/lib/db/knowledge-repository";
import { chunkMarkdown } from "./chunker";
import type { Embedder } from "./embedder";
import { parseKnowledgeDocument } from "./knowledge-document";

export type KnowledgeFile = { path: string; raw: string };

export type ImportSummary = {
  imported: string[];
  skipped: string[];
  rejected: { path: string; reason: string }[];
};

type ImportOptions = {
  embedder: Embedder | null;
  /** Only documents in this language are imported. Production uses the English translation only. */
  language?: string;
  /** Re-import even when content and embedding model are unchanged. */
  force?: boolean;
  batchSize?: number;
};

/**
 * Parses, chunks, embeds and stores knowledge files. Each document is replaced atomically;
 * unchanged documents (same content hash and embedding model) are skipped.
 */
export async function importKnowledgeFiles(files: KnowledgeFile[], options: ImportOptions): Promise<ImportSummary> {
  const language = options.language ?? "en";
  const batchSize = options.batchSize ?? 64;
  const summary: ImportSummary = { imported: [], skipped: [], rejected: [] };
  const embeddingModel = options.embedder?.model ?? null;

  for (const file of files) {
    let doc;
    try {
      doc = parseKnowledgeDocument(file.raw, file.path);
    } catch (error) {
      summary.rejected.push({ path: file.path, reason: (error as Error).message });
      continue;
    }
    if (doc.language !== language) {
      summary.rejected.push({ path: file.path, reason: `language is ${doc.language}, expected ${language}` });
      continue;
    }

    const state = await getImportState(doc.id);
    if (!options.force && state?.contentHash === doc.contentHash && state.embeddingModel === embeddingModel) {
      summary.skipped.push(doc.id);
      continue;
    }

    const chunks = chunkMarkdown(doc.body);
    const embeddings: (number[] | null)[] = [];
    if (options.embedder) {
      for (let start = 0; start < chunks.length; start += batchSize) {
        const batch = chunks.slice(start, start + batchSize);
        embeddings.push(...(await options.embedder.embed(batch.map((c) => `${doc.title}\n${c.section}\n${c.content}`))));
      }
    }
    await replaceKnowledgeDocument(
      doc,
      chunks.map((chunk, i) => ({ ...chunk, embedding: embeddings[i] ?? null })),
      embeddingModel,
    );
    summary.imported.push(doc.id);
  }
  return summary;
}
