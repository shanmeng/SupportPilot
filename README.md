# SupportPilot

**Agentic RAG Technical Support Assistant** — proposed P2 production-grade educational application; HW3 context-engineering starter materials.

## Development Status
SupportPilot is currently in the planning and development setup phase as part of Project 2.

The repository includes the Product Requirements Document (PRD), UI prototype, development guidelines, and Agile sprint planning materials. These artifacts establish the foundation for AI-assisted development using VS Code and Claude Code.

Development is organized into two sprints:

- **Sprint 1:** Application foundation, authentication, chat interface, knowledge retrieval, and evidence citations.
- **Sprint 2:** Agentic RAG workflows, payment investigation tools, automated testing, CI/CD, and deployment.

Implementation progress will be tracked through GitHub Issues and the Project Board.

## Navigate
- [PRD](docs/PRD.md)
- [Dashboard visual mockup](docs/mockups/dashboard.html) — open locally in a browser and capture a screenshot for HW3; this HTML is a design prototype, not a working app
- [AI instruction file](AGENTS.md)
- [Claude Code adapter](CLAUDE.md)
- [Experiment protocol](docs/hw3/experiment-plan.md)
- [Comparison worksheet](docs/hw3/comparison.md)

## Planned stack
VS Code + Claude Code; Next.js App Router, TypeScript, Tailwind CSS; Next.js Route Handlers (Node.js); PostgreSQL + pgvector; Auth.js with OAuth; Vitest, Testing Library, Playwright; GitHub Actions. These are **planned**: exact package versions will be recorded after initialization.

## Installed versions
Recorded from `package-lock.json` (`npm ls --depth=0`) and `node --version` on Oct 30, 2026. Database, auth and CI are not installed yet.

| Tool | Version |
|---|---|
| Node.js (local) | 26.11.1 |
| Next.js | 16.4.3 |
| React / React DOM | 19.3.0 |
| TypeScript | 5.9.3 |
| Tailwind CSS | 4.3.3 |
| ESLint | 9.39.5 |
| Vitest | 5.0.5 |
| @testing-library/react | 16.3.3 |
| @testing-library/jest-dom | 7.0.1 |
| @testing-library/user-event | 14.6.8 |
| jsdom | 30.1.3 |

## Scripts
`npm run dev` · `npm run build` · `npm run lint` · `npm run typecheck` · `npm test`

## Roadmap
Sprint 1: Oct 30–Nov 5, 2026. Sprint 2: Nov 6–Nov 10, 2026. Release buffer: Nov 11–12, 2026.

## Attribution and dataset
An educational Python/FastAPI Agentic RAG reference. This project plans an independently built TypeScript web app. The corresponding dataset is distributed separately; do not commit its archive, business snapshot, or embeddings before verifying the rights to redistribute them publicly.
