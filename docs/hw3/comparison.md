# HW3 — Before/After Context Engineering Experiment

**Project:** SupportPilot  
**Feature:** US-05 — Evidence Citation Cards  
**Baseline commit:** [`3155fc2`](https://github.com/shanmeng/SupportPilot/commit/3155fc2)  
**Experiment A (without rules):** commit [`3d64f39`](https://github.com/shanmeng/SupportPilot/commit/3d64f39) on branch [`experiment/no-rules`](https://github.com/shanmeng/SupportPilot/tree/experiment/no-rules)  
**Experiment B (with rules):** commit [`cdbe427`](https://github.com/shanmeng/SupportPilot/commit/cdbe427) on branch [`experiment/with-rules`](https://github.com/shanmeng/SupportPilot/tree/experiment/with-rules)

## 1. Experiment Setup

I used Claude Code to implement the same feature in two independent Git worktrees created from the same Next.js baseline. The task was to display citations supporting an AI-generated technical support answer. Each citation needed a source title, source ID, excerpt, and document/record type; the UI also needed an empty state, automated component tests, and integration into the application.

- **A — Without Rules:** I disabled the repository's `AGENTS.md` and `CLAUDE.md` instruction files. Claude Code received the feature request without an explicit instruction to consult the PRD or UI mockup.
- **B — With Rules:** I retained `AGENTS.md` and `CLAUDE.md` and explicitly directed Claude Code to follow the linked PRD and UI mockup.

Both worktrees were based on commit `3155fc2`. Next.js 16.4.3 was observed automatically generating an agent-instructions file during development, so I configured `agentRules: false` to prevent framework-generated instructions from contaminating the comparison. This environment adjustment was not intended as a feature difference.

**Important limitation:** The prompts were not perfectly identical: the B prompt additionally instructed Claude Code to follow project rules and linked materials. This was part of the context intervention, but it means the experiment compares *instruction/context packages*, not only the presence of files. The runs also used different Vitest versions.

## 2. Measured Results

| Measure | A — Without Rules | B — With Rules |
|---|---|---|
| Git commit | `3d64f39` | `cdbe427` |
| Component file | `src/components/EvidenceCitations.tsx` | `src/components/chat/evidence-citation-card.tsx` |
| Test file location | `src/components/EvidenceCitations.test.tsx` (co-located with the component) | `tests/unit/components/evidence-citation-card.test.tsx` |
| Folder structure | Flat `src/components/`; does not use the planned `chat/` subfolder or `tests/unit/` | Follows the planned `src/components/chat/` and `tests/unit/` folders; adds shared type in `src/types/evidence.ts` |
| Filename convention | PascalCase; does not follow the specified kebab-case convention | kebab-case; follows the specified convention |
| Test command | `npm test` | `npm test` |
| Vitest version | 4.1.12 | 5.0.5 |
| Test files passed | 1/1 | 1/1 |
| Tests passed | **9/9** | **6/6** |
| Test run duration | 1.13 s | 1.14 s |
| Empty-state test | Yes | Yes |
| Explicit keyboard-interaction test | Not listed | Yes |
| Explicit focus-style test | Not listed | Yes |
| Production build | Not independently verified in the supplied terminal output | **Passed** (`npm run build`) |
| Browser screenshot | Capture/attach A screenshot | B screenshot captured |

**Test counts measure the number of passing assertions, not quality.** The 9-versus-6 result is not evidence that A or B is inherently better.

## 3. Test Coverage Comparison

### A — Without Rules: 9 passing tests

The output reports six `EvidenceCitations` component tests and three `shortenExcerpt` utility tests. Named checks include:

- Renders source title, exact ID, type, and excerpt for each card.
- Provides an accessible label containing the source kind and title.
- Displays the number of sources.
- Displays a neutral empty state.
- Preserves source IDs exactly.
- Shortens long excerpts and handles whitespace and word boundaries.

These tests demonstrate attention to displayed content and text formatting. The supplied test list does **not** show a dedicated test of keyboard operation or focus styling; this does not prove those behaviors are absent from the implementation.

### B — With Rules: 6 passing tests

The output reports four `EvidenceCitationCard` tests and two `EvidenceCitationList` tests. Named checks include:

- Renders the exact title, ID, excerpt, and type for a document source.
- Distinguishes record sources from documents.
- Does not make a noninteractive citation focusable.
- Exposes a keyboard-operable button with visible focus styling when a citation is selectable.
- Preserves source order in a labeled list.
- Displays a neutral empty state without source identifiers when there are no sources.

This test suite explicitly checks interactive semantics and keyboard accessibility—important aspects of a citation UI that were not listed as dedicated A-side tests.

## 4. Observed Differences and Interpretation

**Naming and folder consistency.** A produced `src/components/EvidenceCitations.tsx` with a co-located test, while B produced `src/components/chat/evidence-citation-card.tsx`, placed its test in `tests/unit/components/`, and extracted the source type to `src/types/evidence.ts`. B's filename follows the documented kebab-case convention, and its file locations match the planned folder boundaries in `AGENTS.md` §3. This is a concrete example of project rules influencing implementation details beyond the short feature prompt.

**Test priorities.** A spent three tests on excerpt-shortening behavior; B instead explicitly tested whether interactive citations are keyboard-operable and whether noninteractive citations stay out of the tab order. Both approaches contain useful checks. B's tests more visibly reflect accessibility-oriented acceptance criteria; A's tests explore additional text-processing behavior.

**Evidence integrity.** Both runs test exact source identifiers, and B also checks exact excerpts. Because citation content supports technical investigations, preserving identifiers and source text is particularly important. Excerpt truncation should be a deliberate product choice rather than an undocumented transformation.

**Design fidelity.** B was instructed to use the PRD and UI mockup. A and B browser screenshots should be placed side by side in the submission and assessed against specific visual criteria, such as card hierarchy, source-type labels, spacing, empty-state wording, responsiveness, and focus indication. A definitive claim that one screen matches the mockup better requires that visual review; the test logs alone cannot establish visual fidelity.

**Build confidence.** B's independently executed `npm run build` completed successfully with Next.js 16.4.3 and TypeScript validation. A's `npm test` passed, but its production-build outcome was not included in the terminal output used for this report; it should not be represented as independently confirmed.

## 5. Threats to Validity

1. **Different dependency versions:** A used Vitest 4.1.12 and B used Vitest 5.0.5. The similar run times (~1.1 seconds) are therefore not a meaningful performance comparison.
2. **Different prompt/context packages:** B explicitly referenced the rules, PRD, and mockup; A did not. These changes constitute the treatment but prevent attribution to `AGENTS.md` alone.
3. **Framework-injected context:** Next.js initially generated its own `AGENTS.md` during the A run. The file was removed and generation disabled. The event is important because hidden or automatically injected instructions can undermine a purported "no-rules" baseline.
4. **Self-authored tests:** Each AI implementation generated its own tests. Passing those tests does not independently establish fulfillment of all issue acceptance criteria.
5. **Single trial:** There was one recorded implementation per condition. Results are illustrative, not statistically generalizable.

## 6. Conclusion and Proposed Rules Refinement

The experiment shows a **specific, observable benefit** from supplying project context: B followed the documented filename convention and explicitly tested keyboard/focus behavior. A also produced a functional tested implementation, with **more passing tests**, so the outcome should not be described as a blanket win for B. The meaningful difference is *which requirements the generated code and tests emphasized*.

Based on these results, I would refine `AGENTS.md` to require a short feature-specific verification checklist before a task is marked complete: (1) preserve exact citation IDs and source text, (2) test document and record variants, (3) test populated and empty lists, (4) verify keyboard and focus behavior when the UI is interactive, (5) check the actual rendered component against the approved mockup at desktop and mobile widths, and (6) document any intentional excerpt truncation. This makes the rules more concrete and reduces reliance on the agent's implicit assumptions.

## 7. Evidence Checklist

- [x] Baseline commit recorded: `3155fc2`.
- [x] A commit recorded: `3d64f39`.
- [x] B commit recorded: `cdbe427`.
- [x] A test output: 9/9 passed.
- [x] B test output: 6/6 passed.
- [x] B production build passed.
- [x] B browser screenshot captured.
- [x] Attach or link the A browser screenshot.
- [x] Commit the refined `AGENTS.md`.
