import { describe, expect, it } from "vitest";
import { checkHealth } from "@/lib/health";

describe("checkHealth", () => {
  it("reports ok when the database and pgvector are available", async () => {
    const result = await checkHealth({
      pingDatabase: async () => undefined,
      hasVectorExtension: async () => true,
    });

    expect(result).toEqual({
      httpStatus: 200,
      body: { status: "ok", checks: { database: "ok", vector: "ok" } },
    });
  });

  it("reports degraded with 503 when pgvector is missing", async () => {
    const result = await checkHealth({
      pingDatabase: async () => undefined,
      hasVectorExtension: async () => false,
    });

    expect(result.httpStatus).toBe(503);
    expect(result.body).toEqual({ status: "degraded", checks: { database: "ok", vector: "missing" } });
  });

  it("reports degraded with 503 and hides error details when the database is unreachable", async () => {
    const result = await checkHealth({
      pingDatabase: async () => {
        throw new Error("connect ECONNREFUSED postgres://user:secret@db:5432");
      },
      hasVectorExtension: async () => true,
    });

    expect(result.httpStatus).toBe(503);
    expect(result.body).toEqual({
      status: "degraded",
      checks: { database: "unavailable", vector: "unknown" },
    });
    expect(JSON.stringify(result.body)).not.toContain("secret");
  });
});
