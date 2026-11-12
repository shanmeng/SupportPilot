import { describe, expect, it } from "vitest";
import { parseServerEnv } from "@/lib/env";

describe("parseServerEnv", () => {
  it("accepts a PostgreSQL connection string", () => {
    const env = parseServerEnv({
      DATABASE_URL: "postgres://supportpilot:secret@localhost:5432/supportpilot",
    });

    expect(env.DATABASE_URL).toBe("postgres://supportpilot:secret@localhost:5432/supportpilot");
  });

  it("accepts the postgresql:// scheme", () => {
    const env = parseServerEnv({
      DATABASE_URL: "postgresql://user:pw@db.example.com/app?sslmode=require",
    });

    expect(env.DATABASE_URL).toContain("postgresql://");
  });

  it("rejects a missing DATABASE_URL", () => {
    expect(() => parseServerEnv({})).toThrow(/DATABASE_URL/);
  });

  it("rejects a non-PostgreSQL URL", () => {
    expect(() => parseServerEnv({ DATABASE_URL: "mysql://localhost/app" })).toThrow(
      /DATABASE_URL/,
    );
  });

  it("does not echo the connection string in error messages", () => {
    try {
      parseServerEnv({ DATABASE_URL: "mysql://user:topsecret@localhost/app" });
      expect.unreachable();
    } catch (error) {
      expect(String(error)).not.toContain("topsecret");
    }
  });
});
