import type { Metadata } from "next";
import { SwaggerUi } from "./swagger-ui";

export const metadata: Metadata = { title: "API docs · SupportPilot" };

/** Public API documentation (no data, no secrets): Swagger UI over the OpenAPI document. */
export default function ApiDocsPage() {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
      <h1 className="text-2xl font-bold tracking-tight">SupportPilot API</h1>
      <p className="mt-2 text-sm text-[#586982]">
        OpenAPI 3.1 document:{" "}
        <a className="text-[#2459d3] underline" href="/api/v1/openapi.json">
          /api/v1/openapi.json
        </a>
        . All endpoints except health require signing in to the app first (session cookie).
      </p>
      <div className="mt-6 overflow-x-auto rounded-xl border border-[#dde5f0] bg-white">
        <SwaggerUi />
      </div>
    </main>
  );
}
