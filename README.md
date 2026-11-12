# SupportPilot

**Agentic RAG Technical Support Assistant**

## Development Status
SupportPilot is currently in the planning and development setup phase as part of Project 2.

The repository includes the Product Requirements Document (PRD), UI prototype, development guidelines, and Agile sprint planning materials. These artifacts establish the foundation for AI-assisted development using VS Code and Claude Code.

Development is organized into two sprints:

- **Sprint 1:** Application foundation, authentication, chat interface, knowledge retrieval, and evidence citations.
- **Sprint 2:** Agentic RAG workflows, payment investigation tools, automated testing, CI/CD, and deployment.

Implementation progress will be tracked through GitHub Issues and the Project Board.

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
AI harness: VS Code + Claude Code (approved by the professor as the course IDE harness), guided by [`AGENTS.md`](AGENTS.md).

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

Planned for later stories: Auth.js with OAuth (US-02), Playwright E2E and GitHub Actions CI (US-06, US-11).

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

## Testing
Development follows red → green → refactor: a failing test is committed before the implementation (`test: … (red)` then `feat: … (green)`).

| Layer | Location | Runs against |
|---|---|---|
| Unit / component | `tests/unit/` | jsdom, injected fakes; no network or database |
| Integration | `tests/integration/` | A real, disposable PostgreSQL + pgvector database; migrations are applied in `tests/integration/global-setup.ts` |
| End-to-end | `tests/e2e/` (US-11) | Playwright against a running app |

Integration tests require `DATABASE_URL` to point at a **disposable** database:

```bash
npm run db:up
docker compose exec db createdb -U supportpilot supportpilot_test
DATABASE_URL=postgres://supportpilot:supportpilot@localhost:5432/supportpilot_test npm run test:integration
```

Model calls are always mocked in tests; CI needs no API keys.

## CI/CD
GitHub Actions run on every pull request and on pushes to `main`:

| Workflow | Stages |
|---|---|
| `ci.yml` | **Lint + typecheck** → **unit tests** (coverage summary + report artifact) and **integration tests** (pgvector service container) in parallel → **production build**; **security scan** in parallel: `npm audit` (runtime deps fail on moderate, all deps on high), gitleaks secret scan of full history, dependency review on PRs |
| `codeql.yml` | CodeQL `security-extended` analysis on PRs, `main` and weekly |
| `dependabot.yml` | Weekly npm and GitHub Actions update PRs |

Deploy previews and production deployment run through the Vercel GitHub integration (documented in the deployment guide, US-11).

## API
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/v1/health` | Public | Readiness: database reachable and pgvector installed. `200 {"status":"ok"}` or `503 {"status":"degraded"}`; never returns error details. |

Environment variables are validated at startup by `src/lib/env.ts`; error messages name the variable but never print its value.

## Roadmap
Re-baselined on Nov 12, 2026 (original plan: Sprint 1 Oct 30–Nov 5, Sprint 2 Nov 6–10).

- Sprint 1: Nov 12–13, 2026 — [plan, standups, retro](docs/sprints/sprint-1.md)
- Sprint 2: Nov 14–15, 2026
- Project 2 due: Nov 15, 2026, 11:59 pm

## Attribution and dataset
An educational Python/FastAPI Agentic RAG reference. This project plans an independently built TypeScript web app. The corresponding dataset is distributed separately; do not commit its archive, business snapshot, or embeddings before verifying the rights to redistribute them publicly.
