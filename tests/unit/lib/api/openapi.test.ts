import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import { openApiSpec } from "@/lib/api/openapi";

const apiRoot = join(process.cwd(), "src/app/api/v1");

/** Every route handler under src/app/api/v1 as [OpenAPI path, lower-case method]. */
function implementedOperations(): [string, string][] {
  const operations: [string, string][] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      if (statSync(full).isDirectory()) walk(full);
      else if (name === "route.ts") {
        const path = `/api/v1/${relative(apiRoot, dir)}`.replace(/\[(\w+)\]/g, "{$1}");
        for (const [, method] of readFileSync(full, "utf8").matchAll(/export async function (GET|POST|PUT|PATCH|DELETE)\b/g)) {
          operations.push([path, method.toLowerCase()]);
        }
      }
    }
  };
  walk(apiRoot);
  return operations;
}

type Operation = { security?: unknown[]; responses: Record<string, unknown> };
const operation = (path: string, method: string) =>
  (openApiSpec.paths as unknown as Record<string, Record<string, Operation>>)[path]?.[method];

describe("OpenAPI spec", () => {
  it("is OpenAPI 3.1 with a title and version", () => {
    expect(openApiSpec.openapi).toBe("3.1.0");
    expect(openApiSpec.info.title).toBe("SupportPilot API");
    expect(openApiSpec.info.version).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it("documents every implemented /api/v1 route and method", () => {
    const operations = implementedOperations();

    expect(operations.length).toBeGreaterThanOrEqual(6);
    for (const [path, method] of operations) {
      expect(operation(path, method), `${method.toUpperCase()} ${path} is not documented`).toBeDefined();
    }
  });

  it("marks every endpoint except health and the spec itself as requiring the session cookie, with a 401", () => {
    const publicPaths = ["/api/v1/health", "/api/v1/openapi.json"];
    for (const [path, method] of implementedOperations()) {
      const op = operation(path, method) as Operation;
      if (publicPaths.includes(path)) {
        expect(op.security).toEqual([]);
      } else {
        expect(op.security, `${path} security`).toEqual([{ sessionCookie: [] }]);
        expect(op.responses["401"], `${path} 401`).toBeDefined();
      }
    }
  });

  it("uses one error shape for every 4xx response", () => {
    for (const [path, method] of implementedOperations()) {
      const responses = (operation(path, method) as Operation).responses;
      for (const [status, response] of Object.entries(responses)) {
        if (status.startsWith("4")) expect(JSON.stringify(response), `${path} ${status}`).toContain("#/components/schemas/Error");
      }
    }
  });
});
