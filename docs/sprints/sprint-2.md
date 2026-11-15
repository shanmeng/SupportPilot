# Sprint 2 — Agentic investigation, history, progress, E2E and docs

| | |
|---|---|
| **Milestone** | [Sprint 2](https://github.com/shanmeng/SupportPilot/milestone/2) |
| **Dates** | Nov 14 (planning, evening) – Nov 15, 2026, 11:59 pm (P2 deadline, professor-approved extension) |
| **Team** | shanmeng (solo, professor-approved exception) |
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
| [#7](https://github.com/shanmeng/SupportPilot/issues/7) | US-07 Bounded Agentic RAG document tools | High | 5 | To do |
| [#8](https://github.com/shanmeng/SupportPilot/issues/8) | US-08 Scoped payment and webhook investigation | High | 8 | To do |
| [#9](https://github.com/shanmeng/SupportPilot/issues/9) | US-09 Persist and reopen authorized investigations | High | 5 | To do |
| [#10](https://github.com/shanmeng/SupportPilot/issues/10) | US-10 Agent progress and tool activity states | Medium | 3 | To do |
| [#11](https://github.com/shanmeng/SupportPilot/issues/11) | US-11 Playwright E2E and PR CI checks | High | 5 | To do |
| [#12](https://github.com/shanmeng/SupportPilot/issues/12) | US-12 OpenAPI and production deploy docs | High | 3 | To do |
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

### Standup 1 — Nov 14 (evening, sprint planning)
- **Done:**
- **Next:**
- **Blockers:**

### Standup 2 — Nov 15 (morning)
- **Done:**
- **Next:**
- **Blockers:**

### Standup 3 — Nov 15 (afternoon)
- **Done:**
- **Next:**
- **Blockers:**

## Sprint review
_To complete at sprint end._

| Issue | Outcome | PR |
|---|---|---|
| #7 | | |
| #8 | | |
| #9 | | |
| #10 | | |
| #11 | | |
| #12 | | |

Completed points: __ / 31

## Retrospective
_To complete at sprint end._

- **What went well:**
- **What didn't go well:**
- **What to change next time:**
- **AI harness notes:**
- **Feedback** (solo exception: self-assessment in place of partner feedback):
