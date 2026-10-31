# HW3 — Context Engineering Reflection

**Project:** SupportPilot  
**Feature:** US-05 — Evidence Citation Cards  
**Experiment A:** [Without Rules, `3d64f39`](https://github.com/shanmeng/SupportPilot/commit/3d64f39)  
**Experiment B:** [With Rules, `cdbe427`](https://github.com/shanmeng/SupportPilot/commit/cdbe427)  
**Comparison:** [Before/After Report](https://github.com/shanmeng/SupportPilot/blob/main/docs/hw3/comparison.md)

## What I Tested

For this assignment, I wanted to understand whether repository-level instructions would make an AI coding agent more consistent with the requirements of a real software project. I selected US-05, the evidence citation cards for SupportPilot, because the feature has a small implementation scope but several important details: precise source identifiers, document-versus-record labels, an empty state, accessibility, and alignment with a UI mockup.

I created two Git worktrees from the same baseline commit (`3155fc2`) and asked Claude Code to implement the feature independently. In Experiment A, I disabled `AGENTS.md` and `CLAUDE.md` and supplied only the feature request. In Experiment B, I retained those instructions and explicitly directed the agent to follow the PRD and mockup. I saved each implementation in a separate branch and commit so the results could be inspected rather than relying on a chat summary.

## What Changed—and What Did Not

Both experiments generated working components and automated tests. Experiment A passed **9 of 9 tests**; Experiment B passed **6 of 6 tests**. This initially challenged my expectation that a better-defined context would necessarily produce more tests. Looking at the test names was more useful than counting them.

Without rules, the agent tested source counts, exact identifiers, accessible labels, empty states, and excerpt-shortening behavior. With rules, the tests explicitly covered exact source content, the distinction between documents and records, source ordering, and whether selectable citations could be operated by keyboard with visible focus styling. The latter checks aligned more directly with the accessibility requirements documented in my project rules. The B implementation also used a kebab-case component filename, following the repository convention, whereas A created `EvidenceCitations.tsx`.

I learned that **passing tests are not the same as meeting acceptance criteria**. Each agent wrote tests for its own implementation, so both could report green results while emphasizing different behaviors. A had more tests, but that alone did not mean it better satisfied the issue. Conversely, B's focus-related tests did not automatically prove every visual detail matched the mockup; rendered screenshots and human review were still necessary.

## An Unexpected Context Problem

The most surprising issue was not with the feature itself. During Experiment A, Next.js 16.4.3 automatically generated an `AGENTS.md` file when the development server ran. That could have compromised the supposedly rule-free condition. I removed the generated file and disabled automatic generation with `agentRules: false`, then applied the same setting to Experiment B.

This taught me that context engineering includes controlling the **sources of instructions**, not simply writing a good rules file. Frameworks and development tools can introduce context without an explicit user prompt. I also recognize two limitations in my experiment: B's prompt explicitly referenced project documents, so I tested a broader context package rather than `AGENTS.md` in isolation; and the runs used different Vitest versions (4.1.12 and 5.0.5). I therefore cannot attribute every difference solely to the rules or make a meaningful speed comparison from the roughly one-second test runs.

## How I Refined the Rules

After reviewing both outputs, I added a **Citation Component Verification Checklist** to the main repository's `AGENTS.md`. It now explicitly requires kebab-case filenames, exact source IDs/titles/types, populated and empty-list tests, keyboard and focus checks, comparison with the approved mockup, and reporting which acceptance criteria have automated tests. I also added guidance to avoid unnecessary transformations of evidence text.

That last point came directly from Experiment A's excerpt-shortening utility. Truncation can be useful for a compact UI, but in a technical-support investigation it should be an intentional design decision rather than a behavior silently introduced by the agent. Accurate provenance matters more than a polished-looking card.

## How the Rules Connect the PRD and Mockup to Code

The PRD describes *what* US-05 must do, while the dashboard mockup illustrates *how* users should encounter the evidence. `AGENTS.md` translates those sources into coding decisions: put chat UI in `src/components/chat/`, use kebab-case filenames, keep the source ID/title/excerpt exact, show the specified "No verified sources" empty state, and support visible keyboard focus on interactive cards. The with-rules implementation followed the documented component location and filename pattern and tested accessibility requirements directly. This gives the AI a repeatable path from a product requirement to implementation and verification, rather than leaving those decisions to its defaults.

## How GitHub Scrum Supports AI-Assisted Development

My public GitHub Project organizes work through **Backlog → Sprint Todo → In Progress → In Review → Done**. Issues contain user stories and acceptance checklists, labels communicate work type and priority, and Sprint 1 and Sprint 2 milestones establish scope and deadlines. That structure matters when working with Claude Code: I can start a session with a bounded issue, point the agent to its acceptance criteria, track the implementation on an issue-specific branch, and use a PR and test results to verify completion. The agent can help write code and tests, but the board prevents an open-ended AI conversation from becoming the project plan. Because this is an approved solo project, I will document AI-assisted self-review instead of implying that a teammate approved the work.

## Changes I Would Make for Sprint 2

For **Sprint 2 (due November 10)**, I would add a short issue-to-test checklist to the AI workflow: require the agent to identify the relevant PRD section and mockup before coding, map every acceptance criterion to a test or manual verification, and include a screenshot comparison for UI changes. I would also pin dependencies and run a shared test suite in CI so that comparisons and regressions are not distorted by different tool versions or self-selected tests. For SupportPilot's RAG and investigation work, I would expand integration coverage for source provenance, authenticated account scope, and read-only tool behavior. Before moving an issue to Done, I would require the PR to list any untested criteria or incomplete behavior. These are planned improvements, not claims that Sprint 2 CI or integrations already exist.

## What I Would Do Differently

In a future experiment, I would lock dependency versions and use one shared, independently written acceptance-test suite for both runs. I would keep the feature prompt identical and vary only whether the repository context was available. I would also define a short visual-review rubric before implementation—covering source-label hierarchy, empty-state wording, mobile layout, and keyboard focus—so screenshot comparison is less subjective.

My main takeaway is that effective context engineering is not about giving an AI agent the longest possible instructions. It is about providing **specific, testable constraints at the moment they matter**, controlling unexpected instruction sources, and verifying the output against product requirements. For SupportPilot, the rules helped direct attention toward conventions and accessibility, but the final responsibility for correctness remained with me.
