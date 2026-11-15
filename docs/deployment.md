# Setup and deployment guide

Production: **https://support-pilot-two.vercel.app** · API docs: [/api-docs](https://support-pilot-two.vercel.app/api-docs)

## 1. Local development

Prerequisites: Node.js 22.18+ (CI uses 22; the import scripts run TypeScript directly), npm, Docker.

```bash
npm ci
cp .env.example .env.local          # then fill in the values below
docker compose up -d db             # PostgreSQL 17 + pgvector on localhost:5432
DATABASE_URL=postgres://supportpilot:supportpilot@localhost:5432/supportpilot npm run db:migrate
npm run dev                         # http://localhost:3000
```

If port 5432 is already used by another PostgreSQL, run the pgvector container on another port and point `DATABASE_URL` at it.

Load data (the FlowPay dataset is distributed separately and must stay **outside** the repository):

```bash
# 37 English documents (only `language: en` is accepted); embeddings if OPENAI_API_KEY is set
FLOWPAY_DATASET_PATH=/path/to/flowpay-dataset-en npm run db:import-knowledge
# Business records from the original dataset's SQLite file
npm run db:import-business -- /path/to/flowpay-dataset/data/generated/canonical/flowpay.sqlite
```

Sign in locally with `AUTH_TEST_LOGIN=enabled` (test users `e2e-engineer`, `e2e-lead`), or create a local GitHub OAuth app with callback `http://localhost:3000/api/auth/callback/github`.

## 2. Environment variables

| Variable | Where | Purpose |
|---|---|---|
| `DATABASE_URL` | local, CI, Vercel (Neon integration) | Pooled PostgreSQL connection |
| `DATABASE_URL_UNPOOLED` | Vercel (Neon integration) | Direct connection for migrations |
| `AUTH_SECRET` | local, Vercel Production + Preview | Signs and encrypts session JWTs (`openssl rand -base64 33`) |
| `AUTH_GITHUB_ID`, `AUTH_GITHUB_SECRET` | Vercel **Production** (production OAuth app); local OAuth app | GitHub sign-in |
| `LEAD_GITHUB_LOGINS` | local, Vercel | Comma-separated GitHub logins with the Lead role (`shanmeng,e2e-lead`) |
| `AUTH_TEST_LOGIN` | local, CI, Vercel **Preview only** | `enabled` adds the test users; always ignored when `VERCEL_ENV=production` |
| `OPENAI_API_KEY` | local, Vercel Production + Preview | Embeddings and the agent; without it: keyword search and search-only / records-only answers |
| `OPENAI_CHAT_MODEL` | local, Vercel Production + Preview | Agent model (`gpt-6.1-sol`); without it the agent is off |
| `OPENAI_BASE_URL`, `OPENAI_EMBEDDING_MODEL` | optional | OpenAI-compatible endpoint; default embedding model `text-embedding-3-small` |
| `FLOWPAY_DATASET_PATH`, `FLOWPAY_SQLITE_PATH` | local only | Import sources outside the repository |
| `NEON_API_KEY` (secret), `NEON_PROJECT_ID` (variable) | GitHub Actions | Preview-branch cleanup |

Secrets are never committed: `.env*` is git-ignored except `.env.example`, and gitleaks scans the full history in CI.

## 3. Production infrastructure (one-time)

1. **Vercel:** import the GitHub repository (team LifeIsGood, project `support-pilot`). The build command is `npm run vercel-build` (migrations, then `next build`).
2. **Neon:** add it from the Vercel Marketplace (`supportpilot-db`, region `iad1`), connected to Production and Preview, with "Create database branch for deployment" enabled for Preview.
3. **GitHub OAuth app** (production): homepage `https://support-pilot-two.vercel.app`, redirect URI `https://support-pilot-two.vercel.app/api/auth/callback/github`. Put the ID and secret in Vercel Production.
4. **Environment variables:** add the remaining variables from section 2 in Vercel.
5. **Data:** import the documents and business records once into the production database, using its unpooled connection string in your own terminal. Previews branch from production, so they inherit the data.
6. **GitHub:**
   - Secret `NEON_API_KEY` and variable `NEON_PROJECT_ID`.
   - Environments `production` (protected branches only) and `preview`.
   - Branch protection on `main`: 7 required checks, no force-push or deletion. Merge commits are allowed, because the TDD history uses them.

## 4. Release process

1. Open a PR from a `feature/<issue>-…`, `fix/…` or `chore/…` branch. The description says `Closes #n` and includes the TDD commit list, the checks run and an AI-assisted self-review.
2. CI runs lint + typecheck → unit, integration (real pgvector) and **Playwright E2E** in parallel → production build, plus the security scan (npm audit, gitleaks, dependency review) and CodeQL. Vercel builds a preview on its own Neon branch.
3. Check the feature on the preview with the test login.
4. When all 7 required checks pass, merge with a **merge commit**.
5. Vercel deploys `main` to production and migrations run in the build. `production-smoke.yml` (environment `production`) then waits for that deployment and checks health, the 401 responses and that the test login is absent. `neon-preview-cleanup.yml` deletes the PR's Neon branch.

**Rollback:** in Vercel → Deployments, promote the previous production deployment ("Instant Rollback"). Migrations only add tables and columns, so the previous build keeps working against the newer schema.

## 5. Operations

- Health: `GET /api/v1/health` returns `{"status":"ok","checks":{"database":"ok","vector":"ok"}}` (503 when degraded).
- Logs: Vercel → Logs (runtime).
- Costs: each question makes at most 5 model calls (8 for investigations); set a monthly limit in the OpenAI dashboard.
- Neon Free plan: 10 branches per project. Preview branches are deleted automatically when PRs close; Dependabot branches get no previews (`vercel.json`).
