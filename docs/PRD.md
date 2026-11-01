# SupportPilot — Product Requirements Document
**Status:** initial draft (for HW3, may be modified through the completion of Project 2)  
**Target release:** November 12, 2026

## 1. Problem statement
Payment-platform support engineers must combine documentation rules with transaction, event, and webhook-delivery records. A document-only RAG assistant can describe retry rules but cannot establish whether a particular synthetic payment succeeded or why its webhook did not arrive. SupportPilot provides an authenticated investigation workspace with cited answers and narrowly scoped, read-only business queries.

## 2. Target users
- **Technical Support Engineer:** answers documentation questions and investigates a specific payment/webhook incident.
- **Support Lead:** revisits investigation histories and checks supporting evidence.

## 3. Product goals
1. Explain policies using retrieved documentation with visible source titles and IDs.
2. Investigate a particular payment with verified record references, not guesses.
3. Enforce account/environment scoping and user authentication.
4. Persist investigation history and show run states.
5. Deliver a deployed, documented and tested full-stack app.

## 4. Scope and user stories
| ID | As a user/developer, I want to… | Sprint | Priority |
|---|---|---|---|
| US-01 | Initialize a reliable full-stack foundation | 1 | Must |
| US-02 | Sign in/out securely and protect routes | 1 | Must |
| US-03 | Ask questions in a responsive chat UI | 1 | Must |
| US-04 | Retrieve relevant documentation snippets | 1 | Must |
| US-05 | Inspect evidence citations below AI answers | 1 | Must |
| US-06 | Run unit and API integration tests | 1 | Must |
| US-07 | Let the agent select bounded document tools | 2 | Must |
| US-08 | Investigate payment and webhook records | 2 | Must |
| US-09 | Save and reopen investigation history | 2 | Must |
| US-10 | Observe investigation progress and failures | 2 | Should |
| US-11 | Verify user journeys through E2E and CI | 2 | Must |
| US-12 | Review documented API and deployed app | 2 | Must |

Detailed acceptance checklists are tracked in the repository's [GitHub Issues](https://github.com/shanmeng/SupportPilot/issues) (#1–#12, one Issue per user story).

## 5. Essential user journeys
**Document answer:** Authenticate → enter “What happens after a webhook endpoint returns HTTP 410?” → retrieve matching docs → answer with visible document citations.

**Investigate missing notification:** Authenticate → enter account ID, `production`/`sandbox`, payment ID → inspect payment record and associated event/delivery → explain verified status with record IDs → save investigation.

**Incomplete input:** Without account/environment, explain what's missing. Never substitute a different customer's records or claim a specific status based on documentation alone.

## 6. Expected pages and components
- Login page: provider sign-in and auth errors.
- Dashboard: case navigation, question composer, chat history and agent progress.
- `EvidenceCitationCard`: exact source title, ID, kind and excerpt; neutral empty state.
- Investigation detail: steps, result, evidence and prior case history.
- Design reference: [`docs/mockups/dashboard.html`](mockups/dashboard.html), behavior guide [`docs/mockups/README.md`](mockups/README.md).

## 7. Constraints and quality attributes
**Stack:** Next.js/TypeScript/Tailwind; Next.js API routes; PostgreSQL + pgvector; OAuth using Auth.js; OpenAI-compatible LLM; Vitest + Testing Library + Playwright; CI with GitHub Actions; deployment, preview, API docs and security checks.

**Security:** read-only scoped business queries; validated input; least privilege; user-owned histories; no model-authored raw SQL or browser-side secrets. **Accessibility:** mobile layout, keyboard input, focus states, labels, descriptive errors. **Testing:** deterministic fixtures for LLM/tool behavior, TDD on new features, unit/integration/E2E checks and CI.

## 8. Out of scope / risks
**Out of scope for the initial release:** porting an existing reference implementation; modeling a complete payment business domain beyond the payment, event and webhook-delivery records needed for US-08; agent tools beyond `searchDocuments`, `readDocument` and the read-only record queries; checkpointed ask-user orchestration; and a full offline evaluation suite.

**Risks:** The teaching dataset is distributed separately and may carry licensing or redistribution restrictions, so use only the synthetic examples the app needs and do not commit or publish the dataset. Precomputed embeddings only work with the same embedding model and vector dimensions; if the configured model differs, documents must be re-embedded.

## 9. Delivery plan
- Sprint 1: October 30–November 5, 2026 — US-01 through US-06.
- Sprint 2: November 6–November 10, 2026 — US-07 through US-12.
- November 11–12 — integration fixes, tests, deployment verification, screencast and documentation.

## 10. Success measures
- Users can sign in, search documentation and see attributable results.
- Investigation for a representative synthetic payment provides correct scoped record IDs.
- Critical routes reject unauthorized requests; tests pass in CI.
- A deployed URL and OpenAPI documentation allow instructor verification.
