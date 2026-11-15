import { describe, expect, it, vi } from "vitest";
import { EMBEDDING_DIMENSIONS, createOpenAIEmbedder, getQueryEmbedder } from "@/lib/rag/embedder";

const vector = (seed: number) => Array.from({ length: EMBEDDING_DIMENSIONS }, (_, i) => (i === seed ? 1 : 0));

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

describe("createOpenAIEmbedder", () => {
  it("posts the texts to the embeddings endpoint with the bearer key and model", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse(200, { data: [{ index: 0, embedding: vector(0) }] }),
    );
    const embedder = createOpenAIEmbedder({ apiKey: "sk-test-key", fetchImpl });

    await embedder.embed(["webhook retries"]);

    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe("https://api.openai.com/v1/embeddings");
    expect(init.method).toBe("POST");
    expect(init.headers.Authorization).toBe("Bearer sk-test-key");
    expect(JSON.parse(init.body)).toEqual({ model: "text-embedding-3-small", input: ["webhook retries"] });
    expect(embedder.model).toBe("text-embedding-3-small");
  });

  it("returns vectors in input order even if the API returns them out of order", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse(200, { data: [{ index: 1, embedding: vector(1) }, { index: 0, embedding: vector(0) }] }),
    );
    const embedder = createOpenAIEmbedder({ apiKey: "k", fetchImpl });

    const [first, second] = await embedder.embed(["a", "b"]);

    expect(first[0]).toBe(1);
    expect(second[1]).toBe(1);
  });

  it("does not call the API for an empty batch", async () => {
    const fetchImpl = vi.fn();
    const embedder = createOpenAIEmbedder({ apiKey: "k", fetchImpl });

    await expect(embedder.embed([])).resolves.toEqual([]);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("fails with the HTTP status but never includes the API key", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(401, { error: { message: "bad key sk-test-key" } }));
    const embedder = createOpenAIEmbedder({ apiKey: "sk-test-key", fetchImpl });

    const error = await embedder.embed(["x"]).catch((e: Error) => e);

    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toMatch(/HTTP 401/);
    expect((error as Error).message).not.toContain("sk-test-key");
  });

  it("rejects vectors with the wrong dimension", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(200, { data: [{ index: 0, embedding: [0.1, 0.2] }] }));
    const embedder = createOpenAIEmbedder({ apiKey: "k", fetchImpl });

    await expect(embedder.embed(["x"])).rejects.toThrow(/dimension/);
  });
});

describe("getQueryEmbedder", () => {
  it("returns null when no API key is configured (search falls back to keywords)", () => {
    expect(getQueryEmbedder({})).toBeNull();
    expect(getQueryEmbedder({ OPENAI_API_KEY: "  " })).toBeNull();
  });

  it("uses the configured base URL and model", async () => {
    const embedder = getQueryEmbedder({
      OPENAI_API_KEY: "k",
      OPENAI_BASE_URL: "https://llm.example.test/v1/",
      OPENAI_EMBEDDING_MODEL: "custom-embed",
    });

    expect(embedder?.model).toBe("custom-embed");
  });
});
