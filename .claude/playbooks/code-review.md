# Code Review — 6v-simulator

How to review a PR (or a working-tree diff) in this repo. The bar: it builds, it's green, it
keeps the physics correct, and it's tightly scoped.

## 1. Run the gates (from `client/`)

```bash
npm run lint          # ESLint 9 flat config
npm run typecheck     # tsc --noEmit (strict)
npm test              # Jest full suite
npm run build         # tsc -b && vite build — catches build-only breakage
```

For physics-touching PRs, also:

```bash
npm run test:physics      # vertexShapes initialStates physicsFlips heatBath equilibrium
npm run test:performance  # if perf-sensitive (60s timeout)
```

All must pass before approving. See `testing.md`.

## 2. Check the physics invariants

This is the part linters and type-checkers can't see. For any change to
`client/src/lib/six-vertex/`, confirm the change preserves — and ideally has a test for — each
invariant it could affect (full checklist in `physics-validation.md`):

- **Ice rule** — every vertex stays 2-in / 2-out after every transformation. The #1 property.
- **Vertex types** — a₁,a₂,b₁,b₂,c₁,c₂ still map to Fig. 1 (`types.ts`, `vertexShapes.ts`).
- **DWBC High/Low** — initial states still match Fig. 2/3 (`initialStates.ts`).
- **Flip detailed-balance** — 2×2 flips use heat-bath weights consistent with `main.c`
  (`flips.ts` / `physicsFlips.ts` / `cStyleFlipLogic.ts`).
- **Reproducibility** — same seed ⇒ same run (`rng.ts`); deterministic tests still pass.

When in doubt, defer to the paper (`docs/reference/attached_assets/0502314v1.pdf`) and the
reference C implementation (`main.c`), and run the `physics-validator` agent.

## 3. Check scope

- One concern per PR. No mixing fix + feature, refactor + behavior, or formatting + logic.
- < 500 lines / < 10 files as a guideline. If it's bigger, ask whether it should be split.
- Title is business-readable (see `titles.md`).
- Run `pr-scope-reviewer` if the diff feels sprawling.

## 4. Check the code

- Idiomatic React 19 + TS strict; no needless re-renders in hot paths (simulation loop, Canvas
  draw — see `performance.md`).
- Renderer changes: compare output against the paper figure / the relevant debug route
  (`/dwbc-verify`, `/flip-debug`).
- Persistence changes (`client/src/lib/storage/`): validate/guard anything read back from
  IndexedDB/localStorage.

## 5. Use the agents

Dispatch the relevant reviewers in parallel (see `agent-ensemble.md`):
`code-review-architect` + `pr-scope-reviewer` + `qa-test-engineer` always; add
`physics-validator` for physics, `ux-ui-designer` for UI, `devops-engineer` for CI/workflow,
`site-reliability-engineer` for performance. Resolve CRIT/HIGH findings before merge.

## 6. Verdict

Approve only when: CI green, physics invariants hold (with tests), scope is clean, and no
unresolved CRIT/HIGH findings remain.
