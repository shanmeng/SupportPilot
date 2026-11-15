import { describe, expect, it } from "vitest";
import { GET } from "@/app/api/v1/openapi.json/route";

describe("GET /api/v1/openapi.json", () => {
  it("serves the OpenAPI document publicly as JSON", async () => {
    const response = await GET();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/json");
    const spec = await response.json();
    expect(spec.openapi).toBe("3.1.0");
    expect(Object.keys(spec.paths)).toContain("/api/v1/answers");
  });
});
