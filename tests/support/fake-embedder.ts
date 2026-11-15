import type { Embedder } from "@/lib/rag/embedder";
import { EMBEDDING_DIMENSIONS } from "@/lib/rag/embedder";

const STOPWORDS = new Set(["the", "and", "for", "with", "what", "when", "after", "does", "that", "this", "are", "its", "from"]);

function hash(token: string): number {
  // FNV-1a, 32-bit
  let h = 0x811c9dc5;
  for (let i = 0; i < token.length; i++) {
    h ^= token.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0) % EMBEDDING_DIMENSIONS;
}

/** Deterministic hashed bag-of-words vectors: texts sharing words are similar, unrelated texts are not. */
export function fakeEmbedding(text: string): number[] {
  const vector = new Array<number>(EMBEDDING_DIMENSIONS).fill(0);
  const tokens = text.toLowerCase().match(/[a-z0-9]{3,}/g) ?? [];
  for (const token of tokens) {
    if (!STOPWORDS.has(token)) vector[hash(token)] += 1;
  }
  const norm = Math.hypot(...vector);
  return norm === 0 ? vector : vector.map((v) => v / norm);
}

export function createFakeEmbedder(options: { failing?: boolean } = {}): Embedder & { calls: string[][] } {
  const calls: string[][] = [];
  return {
    model: "fake-hashed-bow",
    dimensions: EMBEDDING_DIMENSIONS,
    calls,
    async embed(texts) {
      calls.push(texts);
      if (options.failing) throw new Error("Embedding request failed with HTTP 503");
      return texts.map(fakeEmbedding);
    },
  };
}
