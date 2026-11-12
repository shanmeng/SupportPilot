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
| [#1](https://github.com/shanmeng/SupportPilot/issues/1) | US-01 Initialize Next.js full-stack app and database | High | 3 | To do |
| [#6](https://github.com/shanmeng/SupportPilot/issues/6) | US-06 Configure unit and integration test foundation | High | 3 | To do |
| [#2](https://github.com/shanmeng/SupportPilot/issues/2) | US-02 Implement OAuth sign-in and protected sessions | High | 5 | To do |
| [#4](https://github.com/shanmeng/SupportPilot/issues/4) | US-04 Create document search API with evidence metadata | High | 5 | To do |
| [#3](https://github.com/shanmeng/SupportPilot/issues/3) | US-03 Build responsive support chat dashboard | High | 3 | To do |
| [#5](https://github.com/shanmeng/SupportPilot/issues/5) | US-05 Build accessible evidence citation cards | High | 2 | To do |
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
_To complete at sprint end: which stories closed, demoable increment, links to merged PRs and the preview deployment._

| Issue | Outcome | PR |
|---|---|---|
| #1 | | |
| #2 | | |
| #3 | | |
| #4 | | |
| #5 | | |
| #6 | | |

Completed points: __ / 21

## Retrospective
_To complete at sprint end._

- **What went well:**
- **What didn't go well:** (include the original-schedule slip and its cause)
- **What to change in Sprint 2:**
- **AI harness notes:** where Claude Code helped or went wrong; any rules added to `AGENTS.md` as a result (link the commits).
- **Feedback** (solo exception: self-assessment in place of partner feedback):
