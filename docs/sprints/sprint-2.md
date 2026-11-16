# Sprint 2 — Agentic investigation, history, progress, E2E and docs

| | |
|---|---|
| **Milestone** | [Sprint 2](https://github.com/shanmeng/SupportPilot/milestone/2) |
| **Dates** | Nov 14 (planning, evening) – Nov 15, 2026, 11:59 pm (P2 deadline, professor-approved extension) |
| **Team** | shanmeng (solo, professor-approved) |
| **AI harness** | Claude Code (professor-approved), guided by [`AGENTS.md`](../../AGENTS.md) |

## Sprint goal
A signed-in support engineer can ask a documentation question and get a **bounded, agent-written answer that cites real documents**, or give an account ID, environment and payment ID and get a **read-only, scope-checked diagnosis that cites real record IDs**. Investigations are saved and can be reopened (engineers see their own, leads see all), progress is visible while the agent works, and the core journeys are covered by Playwright in CI. The public API is documented with OpenAPI.

## Starting point (from Sprint 1)
Production has GitHub sign-in with Engineer/Lead roles, hybrid document search over 37 English FlowPay documents (`POST /api/v1/search`), citation cards and the responsive dashboard. See the [Sprint 1 review](sprint-1.md#sprint-review).

## Sprint backlog
Estimates use story points (Fibonacci) for relative effort and uncertainty, not hours.

| Issue | Story | Priority | Estimate | Status |
|---|---|---|---|---|
| [#29](https://github.com/shanmeng/SupportPilot/issues/29) | Chore: skip Vercel previews for Dependabot branches | Medium | 1 | Done (Nov 14) |
| [#34](https://github.com/shanmeng/SupportPilot/issues/34) | Chore: delete Neon preview branches when a PR closes | Medium | 1 | Done (Nov 14) |
| [#7](https://github.com/shanmeng/SupportPilot/issues/7) | US-07 Bounded Agentic RAG document tools | High | 5 | Done |
| [#8](https://github.com/shanmeng/SupportPilot/issues/8) | US-08 Scoped payment and webhook investigation | High | 8 | Done |
| [#9](https://github.com/shanmeng/SupportPilot/issues/9) | US-09 Persist and reopen authorized investigations | High | 5 | Done |
| [#10](https://github.com/shanmeng/SupportPilot/issues/10) | US-10 Agent progress and tool activity states | Medium | 3 | Done (reduced: no streaming) |
| [#11](https://github.com/shanmeng/SupportPilot/issues/11) | US-11 Playwright E2E and PR CI checks | High | 5 | Done |
| [#12](https://github.com/shanmeng/SupportPilot/issues/12) | US-12 OpenAPI and production deploy docs | High | 3 | Done |
| | **Total** | | **31** (2 done) | |

US-08 is the largest: it adds business tables, an import from the dataset's SQLite file and the scoped tools, and its cross-account isolation tests come first. US-11's CI part already exists from US-06 (lint, typecheck, unit, integration, build, security); E2E is the remaining work.

Acceptance criteria are the checklists in the linked issues.

## Design decisions for this sprint
- **Model.**
  - OpenAI-compatible chat API, with the model set by `OPENAI_CHAT_MODEL` (owner's choice).
  - Avoid models OpenAI retires on Dec 11, 2026 (GPT-5, GPT-5 mini, GPT-5 nano, o3).
  - All model calls are mocked in tests and CI.
- **Agent (S2).**
  - A finite budget: at most 3 tool calls and 5 model calls per run.
  - Duplicate tool calls are skipped.
  - Explicit stop reasons: `answered`, `budget_exhausted`, `no_evidence`, `error`.
  - The answer may cite only IDs returned by tools in that run; anything else is dropped and the answer is marked unverified.
  - Retrieved text is passed to the model as data, never as instructions.
- **Business tools (S3).**
  - Tables `accounts`, `payments`, `events`, `webhook_endpoints`, `webhook_deliveries`, imported from `flowpay.sqlite` with Node's built-in `node:sqlite` (no new dependency).
  - Tools are allowlisted, read-only and zod-validated; account ID and environment are required; results are capped; no model-generated SQL.
  - `customers` (emails) and `event_journal` (audit journal) are **not** imported.
- **History (US-09).**
  - Tables `investigations` and `investigation_messages`, with evidence stored as JSON of verified citations.
  - Access goes through `canAccessInvestigation` (engineer: own; lead: all).
- **Progress (US-10).**
  - Server-Sent Events from the investigation route: step labels and outcomes, without private payloads.
  - Cut-list fallback: polling.

## Plan and order (Nov 15)
1. **US-07:**
   - Red tests: budget, dedupe, stop reasons, unverified-citation filtering, mocked model.
   - Green: agent loop and document tools, wired into the dashboard.
2. **US-08:**
   - **Cross-account isolation tests first**, then tables, import, tools.
   - Investigation flow with missing-scope handling (Flow C).
3. **US-09:** persistence and the history sidebar; cross-user rejection tests.
4. **US-10:** SSE progress states in the UI.
5. **US-11:**
   - Playwright with the test login: sign-in, document Q&A with citations, investigation, history.
   - E2E stage in CI; branch protection; GitHub Environments (preview / production).
6. **US-12:**
   - OpenAPI + Swagger UI.
   - Architecture and ER diagrams (Mermaid); deployment guide.
   - Contribution log, `docs/ai-workflow.md`, README.
7. **Release:**
   - Production smoke test.
   - Demo video script (Claude drafts; the owner records).
   - Sprint review and retrospective.

**Definition of done:**
- The acceptance checklist is ticked and tests are committed before implementation (`test: … (red)` → `feat: … (green)`).
- CI is green.
- The PR is merged with a merge commit and its Neon preview branch is deleted by the cleanup workflow.
- The feature is checked on the preview (and on production where relevant).
- An AI-assisted self-review is recorded on the PR.

**Cut list if behind (in order):**
1. SSE → polling (US-10).
2. Simplified lead view (US-09).
3. Fewer business tools (payments + deliveries only).

**Never cut:** auth, isolation tests, TDD commit order, CI, deployment, E2E.

## Standups
Format: done since last standup / next / blockers. **Written by the owner.**

### Blockers during the sprint
- Comparing model providers to decide which one to use.
- Comparing the cost-effectiveness of different OpenAI models.
- Applying for and configuring the OpenAI API key.
- Production data had to be imported manually from my own terminal.
- The Neon branch limit was reached a second time.

### Standup 1 — Nov 14 (evening, sprint planning)
- **Done:** Sprint 1 finished: US-04 document search (#31), US-05 citation cards (#32), US-03 dashboard (#33). Dependabot previews skipped (#30) and Neon preview branches deleted automatically when PRs close (#35). Sprint 1 review and retrospective draft (#36). Sprint 2 planned with estimates (#37).
- **Next:** US-07 bounded document agent (built first with a mocked model), then US-08 payment investigation.
- **Blockers:** Comparing model providers and the cost-effectiveness of OpenAI models; applying for and configuring the OpenAI API key; the Neon branch limit was reached a second time (PR #33 preview).

### Standup 2 — Nov 15 (morning)
- **Done:** OpenAI key configured (`gpt-6.1-sol`, `text-embedding-3-small`); production documents re-imported with embeddings. US-07 agent merged (#38) and verified on production. US-08 scoped investigation merged (#39); business data imported into production from my terminal.
- **Next:** US-09 saved investigations, US-11 Playwright E2E in CI, US-12 API docs and deployment docs.
- **Blockers:** Production data had to be imported manually from my own terminal.

### Standup 3 — Nov 15 (afternoon)
- **Done:** US-09 history (#40), verified on a preview with real data. US-11 Playwright E2E as a CI job (#41); branch protection on `main`. US-12 OpenAPI + Swagger UI, architecture/ER/deployment docs, GitHub Environments and production smoke test (#42). US-10 progress states, reduced scope (#43). Sprint 2 review (#44).
- **Next:** Owner sections of both retrospectives, demo video, individual reflection, submission.
- **Blockers:** None open; live streaming of agent steps (SSE) was cut.

## Sprint review
**All Sprint 2 stories are done (31 / 31 points); US-10 shipped with reduced scope** (no live streaming, see below). Everything was merged on Nov 15 with merge commits after green CI. Production: https://support-pilot-two.vercel.app.

| Issue | Outcome | PR |
|---|---|---|
| #7 US-07 | Bounded documentation agent (Responses API, `gpt-6.1-sol`): ≤5 model / ≤3 tool calls, dedupe, stop reasons, citations verified against retrieved IDs, no AI text without evidence; `POST /api/v1/answers`. Verified on production | [#38](https://github.com/shanmeng/SupportPilot/pull/38) |
| #8 US-08 | Business tables + importer (18,042 payments, 16,957 deliveries); read-only tools bound to the engineer's account + environment (the model has no account parameter); Flow C; cross-account isolation tests. Verified on a preview with real data | [#39](https://github.com/shanmeng/SupportPilot/pull/39) |
| #9 US-09 | Every answer saved; history API with cursor pagination; engineer own / lead all; 404 for others' cases; "Recent cases" sidebar and reopen | [#40](https://github.com/shanmeng/SupportPilot/pull/40) |
| #10 US-10 | Idle / running / completed / failed states, step labels with outcomes in words, investigation-specific running status. **Not done:** live step streaming (SSE) — first item on the cut list | [#43](https://github.com/shanmeng/SupportPilot/pull/43) |
| #11 US-11 | 10 Playwright journeys (auth, documentation, investigation incl. isolation and Flow C, history incl. roles) as a CI job; PR previews documented; branch protection with 7 required checks | [#41](https://github.com/shanmeng/SupportPilot/pull/41) |
| #12 US-12 | OpenAPI 3.1 + Swagger UI (`/api-docs`) with a drift test; architecture, ER, deployment, AI-workflow docs; GitHub Environments; production smoke test after every deploy | [#42](https://github.com/shanmeng/SupportPilot/pull/42) |
| #29, #34 | Dependabot previews skipped; Neon preview branches deleted on PR close | [#30](https://github.com/shanmeng/SupportPilot/pull/30), [#35](https://github.com/shanmeng/SupportPilot/pull/35) |

Completed points: **31 / 31** (US-10 reduced in scope)

**Demoable increment:** sign in with GitHub → ask a documentation question → AI answer citing real documents, with the agent's steps → open "Investigate a payment" (`acct_bg_001`, production, `pay_bg_001_0003`) → diagnosis citing the payment, event, delivery and endpoint records → reopen it from "Recent cases"; a lead sees every engineer's cases. API docs at `/api-docs`.

**Quality at sprint end:** 16 red / 16 green TDD commit pairs on `main`; over 210 Vitest tests (unit + integration on real PostgreSQL + pgvector) and 10 Playwright E2E tests in CI; CodeQL, npm audit, gitleaks and dependency review on every PR; production smoke test after every deploy.

## Retrospective
### What went well
- The agent's safety rules worked with the real model, not just mocks. It handled unrelated questions, prompt injection, and cross-account requests without making up evidence or leaking data.
- Importing real data caught two edge cases early, and I fixed both with tests before pushing.
- Preview testing helped catch problems before production, and I added an automated production smoke test.

### What didn't go well
- I had to cut live progress updates (SSE) to focus on testing, documentation, and deployment.
- I accidentally committed while typecheck was failing again. I fixed it in the next commit, but clearly hadn't learned that lesson from Sprint 1.
- I hit Neon's branch limit again. I also missed Mermaid rendering issues until checking GitHub, and CodeQL caught a race condition in a test helper.

### What I'd change next time
- Run and check typecheck separately before every commit, or add a pre-commit hook.
- Plan time for streaming features earlier, or simplify them from the start.

### AI harness notes
- New in Sprint 2: the harness blocked merges without explicit owner approval each time and blocked one dependency install; Playwright was added after the owner asked for US-11.
- See [ai-workflow.md](../ai-workflow.md) for the full list of AI mistakes and how they were caught.

### Feedback (Solo Self-Assessment)
- **What went well:**
  - I followed the Sprint 1 workflow: tests first, green CI, and preview checks before merging.
  - I cut SSE early to focus on the must-have features and finish on time.
  - I tested the agent with a real model and real data, not just mocks, and the safety checks passed.
- **What I could improve:**
  - **Planning:** I spent too much time comparing AI models and costs. I should have made that decision earlier.
  - **Testing:** I committed code while typecheck was failing again. I need to check the results more carefully.
  - **Docs:** I should preview documentation and diagrams before opening PRs.
- **Working solo:**
  - AI reviews, CI, and E2E tests caught a lot of issues, but I still had to make major decisions without a second opinion.
