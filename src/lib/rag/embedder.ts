import { z } from "zod";

/** Matches `vector(1536)` in the schema and OpenAI `text-embedding-3-small`. */
export const EMBEDDING_DIMENSIONS = 1536;
export const DEFAULT_EMBEDDING_MODEL = "text-embedding-3-small";

export type Embedder = {
  model: string;
  dimensions: number;
  embed(texts: string[]): Promise<number[][]>;
};

const embeddingResponseSchema = z.object({
  data: z.array(z.object({ index: z.number().int(), embedding: z.array(z.number()) })),
});

type OpenAIEmbedderOptions = {
  apiKey: string;
  baseUrl?: string;
  model?: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
};

/** Embeddings through an OpenAI-compatible `/embeddings` endpoint. Errors never include the API key. */
export function createOpenAIEmbedder(options: OpenAIEmbedderOptions): Embedder {
  const baseUrl = (options.baseUrl ?? "https://api.openai.com/v1").replace(/\/+$/, "");
  const model = options.model ?? DEFAULT_EMBEDDING_MODEL;
  const fetchImpl = options.fetchImpl ?? fetch;
  const timeoutMs = options.timeoutMs ?? 15_000;

  return {
    model,
    dimensions: EMBEDDING_DIMENSIONS,
    async embed(texts) {
      if (texts.length === 0) return [];
      const response = await fetchImpl(`${baseUrl}/embeddings`, {
        method: "POST",
        headers: { Authorization: `Bearer ${options.apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model, input: texts }),
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (!response.ok) throw new Error(`Embedding request failed with HTTP ${response.status}`);

      const parsed = embeddingResponseSchema.safeParse(await response.json());
      if (!parsed.success || parsed.data.data.length !== texts.length) {
        throw new Error("Embedding response had an unexpected shape");
      }
      const vectors = [...parsed.data.data].sort((a, b) => a.index - b.index).map((item) => item.embedding);
      if (vectors.some((vector) => vector.length !== EMBEDDING_DIMENSIONS)) {
        throw new Error(`Embedding dimension mismatch: expected ${EMBEDDING_DIMENSIONS}`);
      }
      return vectors;
    },
  };
}

/** The embedder for search queries, or null when no API key is configured (keyword-only search). */
export function getQueryEmbedder(env: Record<string, string | undefined> = process.env): Embedder | null {
  const apiKey = env.OPENAI_API_KEY?.trim();
  if (!apiKey) return null;
  return createOpenAIEmbedder({
    apiKey,
    baseUrl: env.OPENAI_BASE_URL?.trim() || undefined,
    model: env.OPENAI_EMBEDDING_MODEL?.trim() || undefined,
  });
}
