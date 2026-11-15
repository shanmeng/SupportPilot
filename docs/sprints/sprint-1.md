# Sprint 1 — Foundation, Auth, Chat, Retrieval, Citations

| | |
|---|---|
| **Milestone** | [Sprint 1](https://github.com/shanmeng/SupportPilot/milestone/1) |
| **Dates** | Nov 12 – Nov 13, 2026 (re-baselined; see [Schedule change](#schedule-change)) |
| **Team** | shanmeng (solo, professor-approved exception) |
| **AI harness** | VS Code + Claude Code (professor-approved), guided by [`AGENTS.md`](../../AGENTS.md) |

## Sprint goal
A signed-in support engineer can ask a documentation question in the dashboard and see an answer backed by evidence citation cards that show real document IDs, titles and excerpts, on a tested Next.js + PostgreSQL foundation.

## Schedule change
The original plan ran Sprint 1 from Oct 30 to Nov 5 and Sprint 2 from Nov 6 to Nov 10. By Nov 12 no Sprint 1 issue had been closed: the project is being built solo alongside an internship at a fast-paced startup, which left less development time than planned. The professor approved an extension of the Project 2 deadline to Nov 15, 2026, 11:59 pm. On Nov 12 the milestones were re-baselined to Sprint 1 → Nov 13 and Sprint 2 → Nov 15, with scope priorities and a cut list (below) to fit the remaining time. The original dates are kept in each milestone description.

## Sprint backlog
Estimates use story points (Fibonacci: 1, 2, 3, 5, 8) for relative effort and uncertainty, not hours.

| Issue | Story | Priority | Estimate | Status |
|---|---|---|---|---|
| [#1](https://github.com/shanmeng/SupportPilot/issues/1) | US-01 Initialize Next.js full-stack app and database | High | 3 | Done |
| [#6](https://github.com/shanmeng/SupportPilot/issues/6) | US-06 Configure unit and integration test foundation | High | 3 | Done |
| [#2](https://github.com/shanmeng/SupportPilot/issues/2) | US-02 Implement OAuth sign-in and protected sessions | High | 5 | Done |
| [#4](https://github.com/shanmeng/SupportPilot/issues/4) | US-04 Create document search API with evidence metadata | High | 5 | Done |
| [#3](https://github.com/shanmeng/SupportPilot/issues/3) | US-03 Build responsive support chat dashboard | High | 3 | Done |
| [#5](https://github.com/shanmeng/SupportPilot/issues/5) | US-05 Build accessible evidence citation cards | High | 2 | Done |
| | **Total** | | **21** | |

US-05 is estimated low because the component and its tests already exist on `experiment/with-rules` and can be ported (test commit first, then implementation, to keep red → green visible).

Acceptance criteria for each story are the checklists in the linked issues.

## Plan and order
1. **#1 + #6:** scaffold (reuse `experiment/with-rules` config), PostgreSQL via environment variables, Vitest unit + integration setup, first GitHub Actions workflow (lint, typecheck, test) and Vercel preview deploys connected.
2. **#2:** failing test for unauthenticated API access (401) → Auth.js OAuth → protected routes; user record includes a `role`.
3. **#4:** seed synthetic documents written for this project (no course dataset committed); failing integration tests for hit / miss / invalid input → search API.
4. **#3 + #5:** dashboard shell matching the mockup; port citation card tests, then implementation.

**Definition of done:** acceptance checklist ticked, tests committed before implementation, CI green on the PR, PR description says `Closes #n` with test results (and screenshots for UI), AI-assisted self-review recorded on the PR.

**Cut list if behind:** pgvector similarity → PostgreSQL full-text search for US-04; simplified dashboard styling. Auth, server-side authorization tests and CI are not cut.

## Standups
Format: done since last standup / next / blockers.

### Blockers during the sprint (owner)
- Limited development time alongside an internship at a fast-paced startup.
- The PR #26 preview deployment failed because the Neon Free plan's branch limit was reached.
- Auth environment variables were missing on Vercel at first.
- No OpenAI API key yet.

### Standup 1 — Nov 12
- **Done:** HW3 deliverables (rules file, PRD, mockup, A/B experiment). Reviewed P2 requirements against repo state; re-baselined Sprint 1/2 milestones.
- **Next:** #1 scaffold and database connection, #6 test foundation and first CI workflow.
- **Blockers:**

### Standup 2 — Nov 13 (morning)
- **Done:**
- **Next:**
- **Blockers:**

### Standup 3 — Nov 13 (afternoon)
- **Done:**
- **Next:**
- **Blockers:**

## Sprint review
**All six stories are done (21 / 21 points).** They were finished on **Nov 14**, one day after the re-baselined Nov 13 due date: US-01 and US-06 on Nov 12; US-02, US-04, US-05 and US-03 on Nov 14 (Pacific time). Every PR was merged with a merge commit after green CI, so the `test: … (red)` → `feat: … (green)` commits stay visible in `main`.

| Issue | Outcome | PR |
|---|---|---|
| #1 US-01 | Next.js 16 App Router + TypeScript strict + Tailwind 4; Drizzle + PostgreSQL/pgvector; validated env config | [#15](https://github.com/shanmeng/SupportPilot/pull/15) |
| #6 US-06 | Vitest unit (jsdom) + integration (real PostgreSQL + pgvector) projects; multi-stage CI with coverage, security scan (npm audit, gitleaks, dependency review), CodeQL; `/api/v1/health` | [#16](https://github.com/shanmeng/SupportPilot/pull/16) |
| #2 US-02 | Auth.js + GitHub OAuth, JWT sessions, `engineer` / `lead` roles, server-side page/API protection, `/api/v1/me`, test login for previews/E2E (off in production). Verified on the preview with both test users and on production with real GitHub sign-in | [#26](https://github.com/shanmeng/SupportPilot/pull/26) |
| #4 US-04 | `documents` / `document_chunks` (pgvector + full-text), English-only importer, hybrid search (keyword-only without an embedding key), `POST /api/v1/search`. 37 English documents imported into production and verified there | [#31](https://github.com/shanmeng/SupportPilot/pull/31) |
| #5 US-05 | Accessible evidence citation cards (ported from the HW3 `experiment/with-rules` branch), "No verified sources" empty state | [#32](https://github.com/shanmeng/SupportPilot/pull/32) |
| #3 US-03 | Responsive dashboard from the mockup: composer (Enter / Shift+Enter), empty / loading / results / no-match / error states, selected-evidence panel, mobile layout | [#33](https://github.com/shanmeng/SupportPilot/pull/33) |

Completed points: **21 / 21**

**Demoable increment** (production, https://support-pilot-two.vercel.app): sign in with GitHub → ask a documentation question → see matching FlowPay documentation as citation cards with real document IDs, titles, kinds and excerpts → select a card to inspect it. Answers are retrieved passages; generated answers come with the agent in Sprint 2 (US-07).

**Unplanned work done during the sprint** (all small, all through issues/PRs):
- [#27](https://github.com/shanmeng/SupportPilot/pull/27): `AGENTS.md` still described the app as not scaffolded and named Prisma; corrected.
- [#29](https://github.com/shanmeng/SupportPilot/issues/29) / [#30](https://github.com/shanmeng/SupportPilot/pull/30): Dependabot branches no longer create Vercel previews.
- [#34](https://github.com/shanmeng/SupportPilot/issues/34) / [#35](https://github.com/shanmeng/SupportPilot/pull/35): a workflow deletes a PR's Neon preview branch when the PR closes.

## Retrospective
> Facts below were drafted by Claude Code from the repository, PRs and CI history. The owner reviews them and writes the parts marked **(owner)**.

### What went well
- **TDD stayed visible.** Every story has a red test commit before its green commit (US-01 `14f0b2f` → `bbbbb45`, US-06 `1035324` → `694f1c7`, US-02 `93321f7` → `191dd5f` and `b7cc93c` → `262940a`, US-04 `78b3f6d` → `cb48838`, US-05 `d688b2b` → `d4822d5`, US-03 `b318781` / `9c814b4` → `d801665` / `790518d`), and merge commits preserved them.
- **CI caught real problems before merge.** The integration test for idempotent import found a wrong correlated subquery (Drizzle renders interpolated columns unqualified); the security scan blocked a PR (a false positive, handled by rewording rather than disabling the scanner).
- **Every story was checked where users see it:** Vercel previews with the test users, and production for US-02 and US-04.
- **The cut list was not needed:** pgvector, full-text search, citations and the full dashboard all shipped.
- **(owner)** …

### What didn't go well
- **Schedule.** The original Sprint 1 (Oct 30 – Nov 5) slipped because the project is built solo alongside an internship; after re-baselining, the sprint still finished one day late (Nov 14 instead of Nov 13).
- **Deployment environment issues cost time:**
  - The Neon Free plan's 10-branch limit was reached twice (Dependabot previews, then merged-PR previews), so the PR #26 and PR #33 previews failed before building.
  - Auth environment variables were missing on Vercel at first, so every `/api/auth/*` route returned 500 on the preview.
- **Local setup drift.** The local `main` was 28 commits behind `origin/main` with a stale HW3 commit, and `node_modules` was stale; a build run against the stale modules failed after a commit had already been pushed (the code itself was fine and passed CI).
- **(owner)** …

### What to change in Sprint 2
- Keep the automated Neon preview cleanup (#34); check Vercel environment variables before the first deploy of a feature that needs them.
- Run `npm ci` after switching branches or pulling lockfile changes, and never chain a commit or push after a failing check.
- Build the agent (US-07) against a mocked model first, so progress does not depend on obtaining an API key.
- **(owner)** …

### AI harness notes
- **Context:** `AGENTS.md` (loaded through `CLAUDE.md`) kept the work aligned with the rules: TDD order, server-side auth, no invented citations, English-only production data, no secrets in chat or git.
- **Rules file maintained:** `AGENTS.md` was corrected when it misled the AI (PR #27: it said the app was not scaffolded and named Prisma).
- **Where Claude Code went wrong, and how it was caught:**
  - It chained `&&` after a failing build, so a commit was pushed anyway (caught by reading the output; CI confirmed the code).
  - It wrote a raw-SQL subquery that compared a table with itself (caught by an integration test).
  - It said a GitHub OAuth app allows only one callback URL; the GitHub UI showed up to 10 redirect URIs (corrected when the owner shared a screenshot).
  - It wrote a README sentence that tripped gitleaks (caught by CI).
- **Where it helped:**
  - Diagnosing the failed preview from Vercel's provisioning log rather than guessing.
  - Reproducing the Vercel build locally to rule out the code.
  - Verifying each feature on previews and production through the browser.
- **Guardrails that worked:**
  - The harness blocked installing a new dependency (`tsx`), and the import script was written on Node's built-in TypeScript support instead.
  - It blocked merges without the owner's explicit approval.
  - Secrets were always entered by the owner, never pasted into chat.
- **(owner)** …

### Feedback (solo exception: self-assessment in place of partner feedback)
- **(owner)** …
