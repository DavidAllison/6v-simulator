# `.claude/` — Agent & Playbook Library for 6v-simulator

This directory holds the Claude Code configuration for the **6v-simulator** project: a roster
of specialist review/implementation agents and a set of practical playbooks. Together they are
the **dev-quality layer** of the LMNTL fleet conventions, adapted for this single-developer
personal physics-simulation project.

**Production-fleet automation is intentionally excluded** — no Slack rollups, work-orders,
launchd/cron daemons, or Cowork browser orchestration. The fleet's *coordination skills*
(`/claim`, `/release`, `/coord-sweep`, etc.) are still available globally and can be used here,
but nothing in this directory depends on them.

## Layout

- `agents/` — specialist agents invoked via the Task / Agent tool (`subagent_type: <name>`).
- `playbooks/` — practical, repo-specific guides (real paths, real npm scripts, real workflows).
- `settings.local.json` — local Claude Code settings for this repo.

## Agents (`agents/`)

| Agent | Purpose |
|---|---|
| `product-owner` | Scope & user value; prioritization; scope-creep check. |
| `technical-architect` | System/module design, data flow, contract changes. |
| `implementation-engineer` | Write/fix code (flips, simulation, renderer, UI, storage). |
| `physics-validator` | **Repo-specific.** Validate physics vs the paper + `main.c`: ice rule, vertex types, DWBC, detailed-balance, reproducibility. |
| `qa-test-engineer` | Test coverage, edge cases, regression risk. |
| `code-review-architect` | Code quality, patterns, idiomatic React/TS, maintainability. |
| `pr-scope-reviewer` | Single-responsibility / atomic-scope enforcement. |
| `ux-ui-designer` | UX, accessibility, dark-mode + Canvas/controls (UI PRs). |
| `docs-verifier` | Cross-check docs/routes/config against the actual code. |
| `devops-engineer` | CI/CD, GitHub Actions workflows, build config, hooks. |
| `site-reliability-engineer` | Performance & reliability (frame rate, memory, throughput, bundle). |
| `security-risk-auditor` | Dependency risk, unsafe patterns, persistence/input safety. |

See `playbooks/agent-ensemble.md` for when to use each and the suggested workflow.

## Playbooks (`playbooks/`)

| Playbook | Purpose |
|---|---|
| `sdlc.md` | The issue → branch → PR → preview → merge loop; points to `CLAUDE.md` for full detail. |
| `worktrees.md` | Git-worktree isolation for parallel/agent work. |
| `titles.md` | Issue/PR title framing (outcome before the em dash). |
| `agent-ensemble.md` | The agent roster, when to use each, and the review workflow. |
| `code-review.md` | How to review a PR here (gates + physics invariants + scope + agents). |
| `local-development.md` | Getting started, debug/verify routes, commands, layout. |
| `testing.md` | Jest + ts-jest + RTL strategy; the physics suites and what they guard. |
| `deployment.md` | Static build → S3/CloudFront + PR previews; the deploy workflows. |
| `physics-validation.md` | **The canonical physics-correctness checklist** — ice rule, Fig. 1/2/3, flips, RNG. |
| `performance.md` | In-browser performance engineering: frame rate, memory, throughput, bundle. |

## Where to start

- Building or running the app → `playbooks/local-development.md`
- Changing the physics → `playbooks/physics-validation.md` (read this first)
- Reviewing a PR → `playbooks/code-review.md`
- The overall lifecycle → `playbooks/sdlc.md` (and the project root `CLAUDE.md`)
