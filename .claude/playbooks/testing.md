# Testing — 6v-simulator

Tests are the safety net for the physics. The suite is deterministic (seeded RNG), so a change
that breaks an invariant breaks a test. Run from `client/`.

## Stack

- **Jest 30** + **ts-jest** (TypeScript transform)
- **jest-environment-jsdom** (DOM/Canvas-adjacent code)
- **React Testing Library** for component tests

(Not Vitest, not Next.js.)

## Commands (from `client/`)

```bash
npm test                  # jest — full suite
npm run test:watch        # watch mode
npm run test:physics      # jest vertexShapes initialStates physicsFlips heatBath equilibrium
npm run test:performance  # jest performance --testTimeout=60000
npm run test:integration  # jest integration
npm run test:coverage     # full suite + coverage report
npm run test:ci           # --coverage --watchAll=false --maxWorkers=2 (CI parity)
```

During iteration, prefer a narrow run (e.g. `npx jest physicsFlips`) and run the full suite once
before opening the PR.

## What lives in `client/tests/six-vertex/`

| Suite | Guards |
|---|---|
| `iceRuleValidation.test.ts` | **Ice rule** — every vertex 2-in/2-out; preserved across flips. The #1 correctness gate. |
| `vertexShapes.test.ts` | a₁,a₂,b₁,b₂,c₁,c₂ map to the paper's Fig. 1 bold edges. |
| `types.test.ts` | Vertex type definitions / invariants. |
| `initialStates.test.ts` | DWBC High/Low generators match Fig. 2/3 (incl. N=8 and N=24). |
| `physicsFlips.test.ts` | 2×2 flip detection + execution; ice rule preserved. |
| `heatBath.test.ts` | Heat-bath / detailed-balance probabilities match theory + `main.c`. |
| `equilibrium.test.ts` | Long-run statistics / convergence behavior. |
| `reproducibility.test.ts` | Same seed ⇒ identical run. |
| `rng.test.ts` | Seeded PRNG correctness. |
| `rendering.test.ts` | Renderer output (paths / arrows). |
| `snapshot.test.ts` (+ `__snapshots__/`) | Visual-regression snapshots of rendered output. |
| `performance.test.ts` | Flip throughput / timing budgets at scale (see `performance.md`). |
| `errorHandling.test.ts` | Graceful handling of bad input / edge states. |
| `integration.test.ts` | End-to-end simulation flow across modules. |
| `testUtils.ts` | Shared fixtures / helpers. |

## The physics invariants tests must protect

Any change to `client/src/lib/six-vertex/` must keep these green (details in
`physics-validation.md`):

1. **Ice rule** preserved by every transformation.
2. **Vertex types** match Fig. 1.
3. **DWBC High/Low** match Fig. 2/3.
4. **Flips** act on a 2×2 neighborhood with heat-bath / detailed-balance weights from `main.c`.
5. **Reproducibility** — seeded RNG gives deterministic output.

## Adding tests

- Name files `<topic>.test.ts` in `client/tests/six-vertex/`.
- **Always seed the RNG** so the test is deterministic; assert exact configurations where the
  physics is exact.
- New physics logic → add/extend the matching invariant suite *and* wire it into `test:physics`
  if it belongs to the core gate.
- Renderer changes → update `snapshot.test.ts` deliberately (review the snapshot diff; don't
  blind-update).
- A failing test is a defect, not noise — investigate the root cause (state leak, missing seed,
  off-by-one in the 2×2 neighborhood) and fix it; don't dismiss it as flaky.

## CI

`.github/workflows/ci.yml` runs lint + typecheck + tests (matrix Node 20.x / 22.x) + build on
push and PR. `npm run test:ci` reproduces the CI test invocation locally.
