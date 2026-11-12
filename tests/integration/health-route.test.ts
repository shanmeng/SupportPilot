import { describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/v1/health/route";

// `connection()` needs a Next.js request scope; outside the server it only marks the route dynamic.
vi.mock("next/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/server")>()),
  connection: async () => undefined,
}));

describe("GET /api/v1/health (real PostgreSQL)", () => {
  it("returns 200 with database and pgvector checks passing", async () => {
    const response = await GET();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual({
      status: "ok",
      checks: { database: "ok", vector: "ok" },
    });
  });
});
