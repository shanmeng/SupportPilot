import "server-only";
import { readKnowledgeDocument } from "@/lib/db/knowledge-repository";
import type { Embedder } from "@/lib/rag/embedder";
import { searchDocuments } from "@/lib/rag/search";
import type { DocumentTools } from "./document-agent";

/** The agent's read-only document tools, backed by the knowledge tables. */
export function createDocumentTools(deps: { embedder: Embedder | null }): DocumentTools {
  return {
    async searchDocuments(query) {
      const { results } = await searchDocuments({ query, limit: 5 }, { embedder: deps.embedder });
      return results;
    },
    readDocument: readKnowledgeDocument,
  };
}
