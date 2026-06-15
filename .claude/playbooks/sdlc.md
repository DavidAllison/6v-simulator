# SDLC Playbook — 6v-simulator

Concise summary of the development lifecycle for this repo. **The full SDLC lives in
[`CLAUDE.md`](../../CLAUDE.md)** — this file is the quick loop; defer to `CLAUDE.md` for
issue templates, release process, and CI detail.

This is a single-developer personal project (`DavidAllison/6v-simulator`). It is **not** part
of the LMNTL production fleet — no Slack rollups, no work-orders, no launchd automation. The
fleet's *dev-quality* conventions (issue→PR→review, worktrees, agent ensemble) do apply.

## The loop

```
issue  →  branch  →  implement + test  →  PR  →  preview  →  review  →  merge  →  close issue
```

1. **Issue first.** `gh issue create --title "..." --body "..."`. State the user-facing outcome,
   acceptance criteria, and which physics invariants (if any) are in play.
2. **Branch from `main`.** Naming:
   - `feature/issue-N-short-desc`
   - `fix/issue-N-short-desc`
   - also `refactor/*`, `docs/*`, `chore/*`, `perf/*`
3. **Implement in `client/`.** Write/adjust tests alongside (see `testing.md`). Keep physics
   changes anchored to the paper + `main.c` (see `physics-validation.md`).
4. **Verify locally before pushing** (run from `client/`):
   ```bash
   npm run lint && npm run typecheck && npm test && npm run build
   ```
5. **Open the PR.** Fill `.github/pull_request_template.md`. Preview auto-deploys to
   `https://pr-{N}.dev.6v.allison.la` (see `deployment.md`). Add the preview URL to the body.
6. **Review.** Run the relevant agents (see `agent-ensemble.md`, `code-review.md`).
7. **Merge** once CI is green and review passes. **Close the issue** with a short summary.

## Commit messages — conventional commits

```
feat: add height-function convergence tracker

Tracks max height deviation per sweep to detect equilibrium.

Refs #42
```

Types: `feat` · `fix` · `refactor` · `docs` · `test` · `chore` · `ci` · `perf`.

## PR scope rules

- **One concern per PR.** Never mix a bug fix with a feature, refactor with new behavior, or
  formatting with logic.
- **Aim for < 500 lines changed, < 10 files.** If a PR outgrows that, split it (use
  `pr-scope-reviewer`).
- Keep the PR title business-readable — see `titles.md`.

## Pre-merge gates

1. CI green: build + tests + lint + typecheck (`.github/workflows/ci.yml`).
2. Review clean — no unresolved correctness/physics findings.
3. Physics-touching PRs: ice rule + DWBC + detailed-balance + reproducibility still hold
   (see `physics-validation.md`).
4. UI-touching PRs: sanity-check the rendered output against the relevant route / paper figure.

## Pre-commit hooks

Husky + lint-staged run ESLint (auto-fix) and Prettier on staged files. Bypass only for
emergencies with `git commit --no-verify`. If hooks don't run: `git config core.hooksPath .husky`
then reinstall from `client/`.

## Cross-references

- `worktrees.md` — isolated parallel work
- `titles.md` — issue/PR title framing
- `agent-ensemble.md` — the review agent roster + workflow
- `code-review.md` — how to review a PR here
- `testing.md` · `physics-validation.md` · `performance.md` · `local-development.md` · `deployment.md`
