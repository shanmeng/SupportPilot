# SupportPilot

**Agentic RAG Technical Support Assistant**

**Live app:** https://support-pilot-two.vercel.app · **API docs:** [/api-docs](https://support-pilot-two.vercel.app/api-docs) ([OpenAPI JSON](https://support-pilot-two.vercel.app/api/v1/openapi.json))

SupportPilot helps technical-support engineers troubleshoot payments and webhooks on the **synthetic** FlowPay platform. It answers documentation questions with an AI agent that cites the exact documents it retrieved, and it investigates a specific payment read-only, inside one account and environment, citing the real record IDs.

## Features and roles

| Feature | What it does |
|---|---|
| **Documentation Q&A** (Flow A) | Bounded agent (at most 5 model / 3 tool calls) searches and reads 37 English FlowPay documents (hybrid pgvector + full-text). Answers cite document IDs; citations are verified against what the tools returned; no evidence → no AI text |
| **Payment & webhook investigation** (Flow B) | Engineer gives account ID, environment and payment ID; tools bound to that scope read the payment, events, webhook deliveries and endpoint (read-only, allowlisted, no model-generated SQL). Missing scope → asks for it (Flow C) |
| **Evidence citation cards** | Exact ID, title, kind (Document / Record) and excerpt; "No verified sources" when empty; keyboard-selectable into the evidence panel |
| **Saved investigations** | Every answer saved; "Recent cases" sidebar; reopen with the original evidence |
| **Agent transparency** | Each answer shows the agent's steps and why it stopped (answered, no evidence, step limit, needs more information) |

| Role | How | Access |
|---|---|---|
| **Engineer** | Default for GitHub sign-in | Own saved investigations |
| **Lead** | GitHub login in `LEAD_GITHUB_LOGINS` | All engineers' investigations, with owner names |

Previews (not production) also offer test users `e2e-engineer` / `e2e-lead`.

## Documentation

| Document | |
|---|---|
| [Architecture](docs/architecture.md) | System and answer-flow diagrams, Agentic RAG stages S1–S3, roles, delivery pipeline |
| [Database](docs/database.md) | ER diagram, migrations, design notes |
| [Setup and deployment](docs/deployment.md) | Local setup, environment variables, production setup, release and rollback |
| [API](https://support-pilot-two.vercel.app/api-docs) | OpenAPI 3.1 + Swagger UI (`src/lib/api/openapi.ts`) |
| [AI workflow](docs/ai-workflow.md) | How Claude Code was used: context engineering, AI-assisted TDD, mistakes and guardrails |
| [Sprint 1](docs/sprints/sprint-1.md) · [Sprint 2](docs/sprints/sprint-2.md) | Plans, estimates, standups, reviews, retrospectives |
| [Contribution log](docs/contribution-log.md) | Work per issue/PR (solo project) |
| [Project 2 reflection](docs/project2-reflection.md) | Individual reflection on Project 2 |
| [PRD](docs/PRD.md) · [Mockup](docs/mockups/dashboard.html) | Requirements and approved UI concept |

## HW3: Context Engineering Evidence
The `main` branch holds the project rules, design documents and HW3 write-ups. The two experiment implementations of **US-05 Evidence Citation Cards** live on separate branches, both created from baseline commit [`3155fc2`](https://github.com/shanmeng/SupportPilot/commit/3155fc2).

| Item | Where to look |
|---|---|
| Experiment A — without rules | Branch [`experiment/no-rules`](https://github.com/shanmeng/SupportPilot/tree/experiment/no-rules), commit [`3d64f39`](https://github.com/shanmeng/SupportPilot/commit/3d64f39) |
| Experiment B — with rules | Branch [`experiment/with-rules`](https://github.com/shanmeng/SupportPilot/tree/experiment/with-rules), commit [`cdbe427`](https://github.com/shanmeng/SupportPilot/commit/cdbe427) |
| Before/after comparison | [`docs/hw3/comparison.md`](docs/hw3/comparison.md) |
| Reflection | [`docs/hw3/reflection.md`](docs/hw3/reflection.md) |
| Rendered screenshots (A and B) | [`docs/hw3/screenshots/`](docs/hw3/screenshots/) |
| Rules file and post-experiment refinement | [`AGENTS.md`](AGENTS.md) — checklist added in commit [`a4ae562`](https://github.com/shanmeng/SupportPilot/commit/a4ae562) |
| Approved UI mockup | [`docs/mockups/dashboard.html`](docs/mockups/dashboard.html) and [`dashboard.png`](docs/mockups/dashboard.png) |

## Navigate
- [PRD](docs/PRD.md)
- [Dashboard visual mockup](docs/mockups/dashboard.html) — open locally in a browser and capture a screenshot for HW3; this HTML is a design prototype, not a working app
- [AI instruction file](AGENTS.md)
- [Claude Code adapter](CLAUDE.md)
- [Experiment protocol](docs/hw3/experiment-plan.md)
- [Comparison worksheet](docs/hw3/comparison.md)

## Stack
AI harness: Claude Code (professor-approved), guided by [`AGENTS.md`](AGENTS.md).

| Layer | Package | Version |
|---|---|---|
| Runtime | Node.js | 22.x (verified with 22.23.4) |
| Framework | Next.js (App Router, Route Handlers) | 16.4.3 |
| UI | React / React DOM | 19.3.0 |
| Language | TypeScript (strict) | 5.9.3 |
| Styling | Tailwind CSS | 4.3.3 |
| Database | PostgreSQL + pgvector | 17 (Docker image `pgvector/pgvector:pg17`) |
| ORM / migrations | drizzle-orm / drizzle-kit | 0.45.4 / 0.31.11 |
| DB driver | postgres (postgres.js) | 4.1.1 |
| Validation | zod | 4.6.7 |
| Unit / integration tests | Vitest + React Testing Library | 5.0.5 / 16.3.3 |
| Authentication | Auth.js (`next-auth`) with GitHub OAuth, JWT sessions | 5.0.0-beta.32 |
| E2E tests | Playwright | 1.65.1 |
| AI model | OpenAI Responses API (`fetch`, no SDK); chat `gpt-6.1-sol`, embeddings `text-embedding-3-small` | configured by env vars |
| API docs | OpenAPI 3.1 + Swagger UI (jsDelivr, with SRI) | 3.1.0 / 5.17.14 |
| CI/CD | GitHub Actions (CI, CodeQL, production smoke test, Neon preview cleanup); Vercel + Neon | — |

## Local setup
Prerequisites: Node.js 22, npm, Docker.

```bash
npm ci
cp .env.example .env.local   # adjust DATABASE_URL if not using the Docker database
npm run db:up                # start PostgreSQL + pgvector on localhost:5432
npm run db:migrate           # apply migrations (enables the vector extension)
npm run dev                  # http://localhost:3000
```

`drizzle-kit` reads `DATABASE_URL` from the shell, so export it (or prefix the command) when running `db:migrate`, e.g. `DATABASE_URL=postgres://supportpilot:supportpilot@localhost:5432/supportpilot npm run db:migrate`.

| Script | What it does |
|---|---|
| `npm run dev` | Start the Next.js dev server |
| `npm run build` / `npm start` | Production build / serve |
| `npm run lint` | ESLint |
| `npm run typecheck` | Generate Next.js route types, then `tsc --noEmit` |
| `npm test` | All Vitest projects (unit + integration) |
| `npm run test:unit` | Unit and component tests (jsdom, no database) |
| `npm run test:integration` | API and database tests against real PostgreSQL + pgvector |
| `npm run test:coverage` | All tests with a V8 coverage report in `coverage/` |
| `npm run db:up` | Start the local Docker database |
| `npm run db:generate` | Generate a migration from `src/lib/db/schema.ts` |
| `npm run db:migrate` | Apply migrations in `drizzle/` |
| `npm run vercel-build` | Used by Vercel only: apply migrations to the target database, then build |
| `npm run db:import-knowledge` | Import knowledge-base Markdown into `documents` / `document_chunks` (see [Knowledge base](#knowledge-base-and-document-search)) |

## Testing
Development follows red → green → refactor: a failing test is committed before the implementation (`test: … (red)` then `feat: … (green)`).

| Layer | Location | Runs against |
|---|---|---|
| Unit / component | `tests/unit/` | jsdom, injected fakes; no network or database |
| Integration | `tests/integration/` | A real, disposable PostgreSQL + pgvector database; migrations are applied in `tests/integration/global-setup.ts` |
| End-to-end | `tests/e2e/` | Playwright (Chromium) against a production build (`next start`) with the test login and a disposable database seeded with the synthetic fixtures; no API keys, so answers are deterministic |

Integration tests require `DATABASE_URL` to point at a **disposable** database:

```bash
npm run db:up
docker compose exec db createdb -U supportpilot supportpilot_test
DATABASE_URL=postgres://supportpilot:supportpilot@localhost:5432/supportpilot_test npm run test:integration
```

Model calls are always mocked in tests; CI needs no API keys.

End-to-end tests locally (needs a **disposable** database; the seed truncates it):

```bash
npx playwright install chromium
export DATABASE_URL=postgres://supportpilot:supportpilot@localhost:5432/supportpilot_e2e
E2E_ALLOW_SEED=yes npm run e2e:seed   # migrations + 3 fixture documents + 2 fixture accounts
npm run build && npm run test:e2e
```

The specs cover sign-in/sign-out and roles, documentation answers with citation cards and the "No verified sources" state, payment investigation with record citations, cross-account isolation and Flow C (missing scope), and saved history (reload, reopen, engineer vs lead access).

## CI/CD
GitHub Actions run on every pull request and on pushes to `main`:

| Workflow | Stages |
|---|---|
| `ci.yml` | **Lint + typecheck** → **unit tests** (coverage summary + report artifact), **integration tests** (pgvector service container) and **E2E tests** (Playwright against a seeded service database; report uploaded on failure) in parallel → **production build**; **security scan** in parallel: `npm audit` (runtime deps fail on moderate, all deps on high), gitleaks secret scan of full history, dependency review on PRs |
| `codeql.yml` | CodeQL `security-extended` analysis on PRs, `main` and weekly |
| `dependabot.yml` | Weekly npm and GitHub Actions update PRs |
| `neon-preview-cleanup.yml` | When a PR is merged or closed, deletes its Neon database branch `preview/<git-branch>` (never `main`); can also be run by hand for a given git branch |

Deploy previews and production deployment run through the Vercel GitHub integration: every PR gets a preview URL, and every push to `main` deploys to production. The database is PostgreSQL hosted on Neon (Vercel Marketplace integration); each preview deployment gets its own Neon database branch. Vercel runs `npm run vercel-build`, which applies pending migrations (`drizzle-kit migrate`, using `DATABASE_URL_UNPOOLED` when available) before `next build`, so the schema always matches the deployed code.

Dependabot branches (`dependabot/**`) do not get Vercel previews (`git.deploymentEnabled` in `vercel.json`). Each preview creates a Neon branch, and the Neon Free plan allows 10 branches per project; dependency PRs are fully checked by CI and do not need a live preview.

### PR previews
Every PR (except Dependabot's) gets a Vercel preview:
1. Vercel creates a Neon branch `preview/<git-branch>` from the production database, so the preview has the same documents and business records.
2. `npm run vercel-build` applies pending migrations to that branch, then builds.
3. The preview uses the **Preview** environment variables on Vercel: `AUTH_SECRET`, `LEAD_GITHUB_LOGINS=…,e2e-lead`, `AUTH_TEST_LOGIN=enabled` (Preview only), `OPENAI_API_KEY`, `OPENAI_CHAT_MODEL`. GitHub OAuth is configured for production only, so previews are tested with the **test login** (`e2e-engineer`, `e2e-lead`).
4. Previews are behind Vercel deployment protection (team members only).

Preview branches of closed PRs are deleted by `neon-preview-cleanup.yml`. It needs, under **Settings → Secrets and variables → Actions**: the secret `NEON_API_KEY` (a Neon API key) and the variable `NEON_PROJECT_ID` (the Neon project ID, e.g. `mute-tooth-…`).

## API
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/v1/answers` | Session | Documentation answer (agent) or, with `scope: { accountId, environment, paymentId }`, a scoped payment investigation. Returns `mode`, `answer`, verified `citations`, `steps`, `stopReason` and `investigationId`; `needs_scope` + `missingFields` when the scope is incomplete. |
| GET | `/api/v1/investigations` | Session | Saved investigations, newest first (engineer: own; lead: all). `?limit=1..50&cursor=` |
| GET | `/api/v1/investigations/{id}` | Session | One saved investigation; `404` if missing or another engineer's |
| GET | `/api/v1/openapi.json` | Public | OpenAPI 3.1 document (rendered at `/api-docs`) |
| GET | `/api/v1/me` | Session | The signed-in user: `id`, `name`, `email`, `image`, `role` (`engineer` or `lead`). `401` when signed out or the session is invalid. |
| GET/POST | `/api/auth/*` | — | Auth.js sign-in, callback, session and sign-out endpoints |
| POST | `/api/v1/search` | Session | Documentation search. Body `{ "query": string (2–500 chars), "limit"?: 1–10 (default 5) }`. Returns `{ "mode": "hybrid" \| "keyword", "results": [{ "id", "chunkId", "title", "kind", "authority", "section", "excerpt", "score" }] }`, at most one result per document; `results` is empty when nothing matches. `400 invalid_request` for invalid input. |
| GET | `/api/v1/health` | Public | Readiness: database reachable and pgvector installed. `200 {"status":"ok"}` or `503 {"status":"degraded"}`; never returns error details. |

Errors from `/api/v1` use one shape: `{ "error": { "code": "unauthorized", "message": "…" } }`.

## Knowledge base and document search
Documentation evidence comes from the FlowPay knowledge base (synthetic). **Only the English translation is imported**; the importer rejects any document whose front matter is not `language: en`. The dataset is distributed separately and is **never committed**.

| Table | Contents |
|---|---|
| `documents` | One row per document. `id` is the dataset's own `doc_id` (e.g. `KB-API-029`), never generated; `kind` (`api_doc`, `business_rule`, `troubleshooting`, `support_case`, `release_note`, `migration_guide`), `authority`, rule IDs, content hash |
| `document_chunks` | Chunks of at most 1000 characters split at Markdown headings; `id` is `<doc_id>#c<NNN>`. `embedding vector(1536)` (HNSW, cosine) is optional; `search_vector` is a generated English `tsvector` (GIN) |

**Search** (`src/lib/rag/search.ts`) combines PostgreSQL full-text search with pgvector similarity using reciprocal rank fusion. Vector hits below a cosine-similarity floor are ignored, so unrelated questions return no results instead of the nearest unrelated document. Without `OPENAI_API_KEY` (or if the embedding call fails) search runs in keyword-only mode. User input is reduced to plain OR-ed words before it reaches `websearch_to_tsquery`, and every value is a bound parameter.

**Import** (Node.js 22.18+; runs TypeScript directly, no extra dependencies):

```bash
export FLOWPAY_DATASET_PATH=/path/outside/the/repo/flowpay-dataset-en   # contains knowledge/<category>/*.md
DATABASE_URL=<target database> npm run db:import-knowledge              # or: npm run db:import-knowledge -- <dir>
```

With `OPENAI_API_KEY` set (in the shell or `.env.local`), chunks are embedded with `text-embedding-3-small`. Unchanged documents are skipped; `--force` re-imports everything. Vercel preview databases are Neon branches of the production database, so import into production once and new previews start with the same documents.

Tests use neither the dataset nor any credentials. The folder `tests/fixtures/knowledge/` holds handwritten synthetic documents, and `tests/support/fake-embedder.ts` is a deterministic hashed bag-of-words embedder.

## Authentication and roles
- **Sign-in:** GitHub OAuth through Auth.js v5. Sessions are signed, encrypted JWTs in an HTTP-only cookie, valid for 8 hours.
- **Users:** the first sign-in creates a row in `users`, keyed by the GitHub account ID; later sign-ins update the profile and role.
- **Roles:**
  - `lead` for GitHub logins listed in `LEAD_GITHUB_LOGINS`; everyone else is `engineer` (least privilege).
  - Engineers can open only their own investigations; leads can open all (`canAccessInvestigation`).
- **Server-side protection:**
  - Pages call `requirePageUser()` and redirect to `/signin` without a valid session.
  - API routes call `requireApiUser()` and return `401`.
  - A session that does not validate (missing or non-UUID id, unknown role) is treated as signed out.
- **Test login:** set `AUTH_TEST_LOGIN=enabled` to add two fixed test users (`e2e-engineer`, `e2e-lead`) for local development and Playwright. The test login is always off when `VERCEL_ENV=production`.

| Variable | Where | Purpose |
|---|---|---|
| `AUTH_SECRET` | local, Vercel (Production + Preview) | Signs and encrypts session JWTs |
| `AUTH_GITHUB_ID`, `AUTH_GITHUB_SECRET` | local (local OAuth app), Vercel Production (production OAuth app) | GitHub OAuth |
| `LEAD_GITHUB_LOGINS` | local, Vercel | Lead allowlist |
| `AUTH_TEST_LOGIN` | local, CI, optionally Vercel Preview | Enables the test users |

Environment variables are validated at startup by `src/lib/env.ts`; error messages name the variable but never print its value.

## Roadmap
Re-baselined on Nov 12, 2026 (original plan: Sprint 1 Oct 30–Nov 5, Sprint 2 Nov 6–10).

- Sprint 1: Nov 12–14, 2026 (due Nov 13; finished one day late) — [plan, standups, review, retro](docs/sprints/sprint-1.md)
- Sprint 2: Nov 14–15, 2026 — [plan, standups, review, retro](docs/sprints/sprint-2.md)
- Project 2 due: Nov 15, 2026, 11:59 pm

## Attribution and dataset
An educational Python/FastAPI Agentic RAG reference inspired the design. This project is an independently built TypeScript web app. The corresponding dataset is distributed separately; do not commit its archive, business snapshot, or embeddings before verifying the rights to redistribute them publicly.
