/**
 * OpenAPI 3.1 description of the public `/api/v1` API, served at `/api/v1/openapi.json` and
 * rendered at `/api-docs`. `tests/unit/lib/api/openapi.test.ts` fails if a route handler under
 * `src/app/api/v1` is not documented here.
 */

const errorResponse = (description: string) => ({
  description,
  content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
});

const json = (schemaRef: string, description: string) => ({
  description,
  content: { "application/json": { schema: { $ref: `#/components/schemas/${schemaRef}` } } },
});

const signedIn = [{ sessionCookie: [] }];
const unauthorized = errorResponse("Not signed in, or the session is invalid.");

export const openApiSpec = {
  openapi: "3.1.0",
  info: {
    title: "SupportPilot API",
    version: "1.0.0",
    description:
      "Agentic RAG support assistant for the synthetic FlowPay payments dataset. Documentation answers cite real document IDs; payment investigations are read-only, scoped to one account and environment, and cite real record IDs. All endpoints except `/health` and this document require a signed-in session (GitHub OAuth through Auth.js; the browser sends the session cookie). Errors use one shape: `{ \"error\": { \"code\", \"message\" } }`.",
  },
  servers: [{ url: "https://support-pilot-two.vercel.app", description: "Production" }],
  tags: [
    { name: "Answers", description: "Documentation answers and payment investigations" },
    { name: "Investigations", description: "Saved investigations (engineers: own; leads: all)" },
    { name: "Session", description: "Signed-in user" },
    { name: "Operations", description: "Health and API description" },
  ],
  paths: {
    "/api/v1/health": {
      get: {
        tags: ["Operations"],
        summary: "Readiness check",
        description: "Database reachable and pgvector installed. Never returns error details.",
        security: [],
        responses: {
          "200": json("Health", "Ready."),
          "503": json("Health", "Degraded."),
        },
      },
    },
    "/api/v1/openapi.json": {
      get: {
        tags: ["Operations"],
        summary: "This OpenAPI document",
        security: [],
        responses: { "200": { description: "OpenAPI 3.1 document.", content: { "application/json": {} } } },
      },
    },
    "/api/v1/me": {
      get: {
        tags: ["Session"],
        summary: "The signed-in user and role",
        security: signedIn,
        responses: { "200": json("User", "The signed-in user."), "401": unauthorized },
      },
    },
    "/api/v1/search": {
      post: {
        tags: ["Answers"],
        summary: "Search the documentation",
        description:
          "Hybrid search (PostgreSQL full-text + pgvector, fused with reciprocal rank fusion); keyword-only without an embedding key. At most one result per document; empty when nothing matches.",
        security: signedIn,
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/SearchRequest" } } } },
        responses: {
          "200": json("SearchResponse", "Matching documentation evidence."),
          "400": errorResponse("Invalid JSON, query not 2-500 characters, or limit not 1-10."),
          "401": unauthorized,
        },
      },
    },
    "/api/v1/answers": {
      post: {
        tags: ["Answers"],
        summary: "Answer a question or investigate a payment",
        description: [
          "Without `scope`: a bounded documentation agent (at most 5 model and 3 tool calls) answers with citations verified against the documents it retrieved; without a configured model, search results only (`mode: search`).",
          "With a full `scope`: a read-only investigation bound to that account and environment (at most 8 model and 6 tool calls); the model cannot choose another account. Without a model, the scoped records are returned (`mode: records`).",
          "A partial scope, or a question that names a record ID without a scope, returns `stopReason: needs_scope` with `missingFields` and is not saved (Flow C).",
          "Every other answer is saved and its `investigationId` returned.",
        ].join("\n\n"),
        security: signedIn,
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/AnswerRequest" } } } },
        responses: {
          "200": json("AnswerResponse", "Answer, verified citations and agent steps."),
          "400": errorResponse("Invalid JSON, question not 2-500 characters, or malformed scope IDs."),
          "401": unauthorized,
        },
      },
    },
    "/api/v1/investigations": {
      get: {
        tags: ["Investigations"],
        summary: "List saved investigations",
        description: "Newest first. Engineers see their own; leads see everyone's with owner names. Cursor-paginated.",
        security: signedIn,
        parameters: [
          { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 50, default: 20 } },
          { name: "cursor", in: "query", schema: { type: "string" }, description: "`nextCursor` from the previous page." },
        ],
        responses: {
          "200": json("InvestigationPage", "One page of investigations."),
          "400": errorResponse("limit outside 1-50."),
          "401": unauthorized,
        },
      },
    },
    "/api/v1/investigations/{id}": {
      get: {
        tags: ["Investigations"],
        summary: "Open a saved investigation",
        description: "404 when it does not exist or belongs to another engineer (its existence is not revealed).",
        security: signedIn,
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          "200": json("Investigation", "The saved investigation."),
          "401": unauthorized,
          "404": errorResponse("Not found or not yours."),
        },
      },
    },
  },
  components: {
    securitySchemes: {
      sessionCookie: {
        type: "apiKey",
        in: "cookie",
        name: "__Secure-authjs.session-token",
        description: "Auth.js session cookie set by signing in at /signin (GitHub OAuth). Encrypted JWT, 8-hour lifetime.",
      },
    },
    schemas: {
      Error: {
        type: "object",
        required: ["error"],
        properties: {
          error: {
            type: "object",
            required: ["code", "message"],
            properties: {
              code: { type: "string", enum: ["unauthorized", "forbidden", "not_found", "invalid_request", "internal_error"] },
              message: { type: "string" },
            },
          },
        },
      },
      Health: {
        type: "object",
        properties: {
          status: { type: "string", enum: ["ok", "degraded"] },
          checks: { type: "object", properties: { database: { type: "string" }, vector: { type: "string" } } },
        },
      },
      User: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          name: { type: ["string", "null"] },
          email: { type: ["string", "null"] },
          image: { type: ["string", "null"] },
          role: { type: "string", enum: ["engineer", "lead"] },
        },
      },
      SearchRequest: {
        type: "object",
        required: ["query"],
        additionalProperties: false,
        properties: {
          query: { type: "string", minLength: 2, maxLength: 500, examples: ["What happens after a webhook endpoint returns HTTP 410?"] },
          limit: { type: "integer", minimum: 1, maximum: 10, default: 5 },
        },
      },
      DocumentEvidence: {
        type: "object",
        properties: {
          id: { type: "string", examples: ["KB-API-032"], description: "The dataset's document ID." },
          chunkId: { type: "string", examples: ["KB-API-032#c003"] },
          title: { type: "string" },
          kind: { type: "string", enum: ["api_doc", "business_rule", "troubleshooting", "support_case", "release_note", "migration_guide"] },
          authority: { type: "string", enum: ["official", "operational_guidance", "historical_case"] },
          section: { type: "string" },
          excerpt: { type: "string", description: "Verbatim text from the document." },
          score: { type: "number" },
        },
      },
      SearchResponse: {
        type: "object",
        properties: {
          mode: { type: "string", enum: ["hybrid", "keyword"] },
          results: { type: "array", items: { $ref: "#/components/schemas/DocumentEvidence" } },
        },
      },
      Scope: {
        type: "object",
        additionalProperties: false,
        properties: {
          accountId: { type: "string", pattern: "^acct_[a-z0-9_]{1,64}$", examples: ["acct_bg_001"] },
          environment: { type: "string", enum: ["production", "sandbox"] },
          paymentId: { type: "string", pattern: "^pay_[a-z0-9_]{1,64}$", examples: ["pay_bg_001_0003"] },
        },
      },
      AnswerRequest: {
        type: "object",
        required: ["question"],
        additionalProperties: false,
        properties: {
          question: { type: "string", minLength: 2, maxLength: 500 },
          scope: { $ref: "#/components/schemas/Scope" },
        },
      },
      Citation: {
        type: "object",
        required: ["id", "title", "excerpt", "kind"],
        properties: {
          id: { type: "string", description: "Document ID (KB-…) or record ID (pay_…, evt_…, del_…, we_…)." },
          title: { type: "string" },
          excerpt: { type: "string" },
          kind: { type: "string", enum: ["document", "record"] },
          detail: { type: "string" },
        },
      },
      AgentStep: {
        type: "object",
        properties: {
          tool: { type: "string" },
          label: { type: "string", examples: ["Read payment pay_bg_001_0003"] },
          outcome: { type: "string", enum: ["ok", "empty", "duplicate", "rejected", "error", "budget"] },
        },
      },
      StopReason: {
        type: ["string", "null"],
        enum: ["answered", "no_evidence", "budget_exhausted", "error", "needs_scope", null],
      },
      AnswerResponse: {
        type: "object",
        properties: {
          mode: { type: "string", enum: ["agent", "search", "records"] },
          answer: { type: ["string", "null"], description: "AI-generated; null in search/records mode." },
          stopReason: { $ref: "#/components/schemas/StopReason" },
          citations: { type: "array", items: { $ref: "#/components/schemas/Citation" }, description: "Only IDs a tool returned in this run." },
          removedCitations: { type: "array", items: { type: "string" }, description: "IDs the model cited that no tool returned; removed." },
          steps: { type: "array", items: { $ref: "#/components/schemas/AgentStep" } },
          missingFields: { type: "array", items: { type: "string" }, description: "Only with needs_scope." },
          investigationId: { type: ["string", "null"], format: "uuid" },
        },
      },
      InvestigationSummary: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          question: { type: "string" },
          scope: { oneOf: [{ $ref: "#/components/schemas/Scope" }, { type: "null" }] },
          stopReason: { $ref: "#/components/schemas/StopReason" },
          ownerName: { type: ["string", "null"] },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      InvestigationPage: {
        type: "object",
        properties: {
          items: { type: "array", items: { $ref: "#/components/schemas/InvestigationSummary" } },
          nextCursor: { type: ["string", "null"] },
        },
      },
      Investigation: {
        allOf: [
          { $ref: "#/components/schemas/InvestigationSummary" },
          {
            type: "object",
            properties: {
              ownerId: { type: "string", format: "uuid" },
              mode: { type: "string", enum: ["agent", "search", "records"] },
              answer: { type: ["string", "null"] },
              citations: { type: "array", items: { $ref: "#/components/schemas/Citation" } },
              steps: { type: "array", items: { $ref: "#/components/schemas/AgentStep" } },
            },
          },
        ],
      },
    },
  },
} as const;
