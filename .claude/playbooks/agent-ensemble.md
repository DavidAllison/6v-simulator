# Agent Ensemble — 6v-simulator

This repo ships a roster of specialist Claude Code agents under
[`.claude/agents/`](../agents/). They are invoked via the **Task / Agent tool**
(`subagent_type: <agent-name>`), each as an independent sub-agent. Use them to plan, implement,
validate, and review work — especially anything that touches the physics core or produces a PR.

This is a personal dev project, so there is **no** Slack rollup, work-order queue, or Cowork
browser-orchestration layer. The roster below is the dev-quality layer only.

## The roster

| Agent | When to use it |
|---|---|
| `product-owner` | Frame the user value / scope of a feature or epic; prioritize; sanity-check scope creep. |
| `technical-architect` | Design decisions — module boundaries, simulation/render data flow, contract changes. |
| `implementation-engineer` | Write or fix code (flip logic, simulation engine, renderer, React UI, storage). |
| `physics-validator` | **Repo-specific.** Verify physics: ice rule, vertex types vs Fig. 1, DWBC High/Low vs Fig. 2/3, flip detailed-balance/weights vs `main.c`, seeded-RNG reproducibility. The source-of-truth gate for any physics change. |
| `qa-test-engineer` | Test coverage, edge cases, regression risk; add/strengthen tests in `client/tests/six-vertex/`. |
| `code-review-architect` | Code quality, patterns, idiomatic React 19 / TS, maintainability, security smell. |
| `pr-scope-reviewer` | Single-responsibility / atomic-scope check; flag scope creep (<500 lines, one concern). |
| `ux-ui-designer` | UI/UX, accessibility, dark-mode + Canvas/controls fit — UI-touching PRs only. |
| `docs-verifier` | Cross-check docs (CLAUDE.md, README, these playbooks, route names) against the actual code after renames/refactors. |
| `devops-engineer` | CI/CD and workflow changes (`.github/workflows/*`), build config, pre-commit hooks. |
| `site-reliability-engineer` | Performance/reliability — frame rate, memory at large N, flip throughput, bundle size. |
| `security-risk-auditor` | Dependency risk, unsafe patterns, anything touching `localStorage`/IndexedDB persistence or external input. (Limited surface — no backend/auth.) |

## Suggested workflow

For a substantial feature or fix, chain the agents:

```
product-owner          → is this worth doing, and what's the scope?
technical-architect    → how should it be structured?
implementation-engineer→ build it (in client/, on a feature branch)
physics-validator      → does it still obey the paper + main.c? (skip only if no physics touched)
qa-test-engineer       → are the tests adequate and green?
code-review-architect  → is the code clean and correct?
pr-scope-reviewer      → is the PR atomic and within scope?
```

Add `ux-ui-designer` for UI changes, `devops-engineer` for workflow/CI changes,
`site-reliability-engineer` / `performance.md` for perf-sensitive changes, and `docs-verifier`
when paths/routes/config move.

## Dispatch

- Load the tool first: `ToolSearch(query="select:Agent", max_results=1)` (falls back to
  `select:Task` in some harnesses).
- For a review pass, dispatch the relevant reviewers **in parallel** in a single message — don't
  serially role-play each reviewer in one context.
- Give each sub-agent the concrete context (branch, diff or files, what changed) — sub-agents
  don't share your context automatically.

## Result shape (encourage in review prompts)

```
## Verdict: PASS | CONCERNS | BLOCK
## Findings
- [CRIT] title — file:line — what's wrong, why it matters
- [HIGH] / [MED] / [LOW] ...
## What I checked / What I did NOT check
```

Resolve CRIT/HIGH before merge. For physics changes, a `physics-validator` BLOCK is a hard gate
— defer to the paper and `main.c`.
