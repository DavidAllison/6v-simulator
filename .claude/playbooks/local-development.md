# Local Development — 6v-simulator

Everything runs from the `client/` directory. Node 20+ required (Vite 7).

## Getting started

```bash
cd client
npm install
npm run dev          # Vite dev server → http://localhost:5173 (HMR)
```

Open http://localhost:5173 for the main simulator.

## Debug / verify routes

The app exposes several routes for inspecting physics and rendering (defined in
`client/src/App.tsx`, components in `client/src/routes/`):

| Route | Purpose |
|---|---|
| `/` | Main simulator — controls, canvas, statistics. |
| `/dwbc-verify` | **Canonical visual gate.** Renders DWBC initial states to compare against the paper's Fig. 2/3. Must match the figures. |
| `/dwbc-debug` | Step-through inspection of DWBC generation / cell state. |
| `/flip-debug` | Step through individual 2×2 flips to confirm ice-rule preservation and flip dynamics. |
| `/performance` | Performance demo / benchmark harness for large lattices (frame rate, throughput). |
| `/model-tests` | In-browser model test page. |

## Commands (all from `client/`)

```bash
npm run dev            # dev server (:5173)
npm run build          # tsc -b && vite build → client/dist/
npm run preview        # serve the production build locally
npm run lint           # eslint .
npm run lint -- --fix  # auto-fix
npm run typecheck      # tsc --noEmit (strict)
npm run format         # prettier --write 'src/**/*.{ts,tsx,js,jsx,json,css}'
npm run format:check   # prettier --check (no writes)
npm test               # jest
npm run test:watch     # jest --watch
npm run benchmark      # node runBenchmark.js (perf numbers)
```

Test subsets and strategy: see `testing.md`.

## Physics core layout

`client/src/lib/six-vertex/`:
- `types.ts` — `VertexType` (a₁,a₂,b₁,b₂,c₁,c₂)
- `vertexShapes.ts` — vertex → bold-edge mapping (Fig. 1)
- `initialStates.ts` — DWBC High/Low generators (Fig. 2/3)
- `rng.ts` — seeded PRNG (reproducibility)
- `flips.ts` / `physicsFlips.ts` / `correctedFlipLogic.ts` / `cStyleFlipLogic.ts` — flip dynamics
- `simulation.ts` / `physicsSimulation.ts` / `optimizedSimulation.ts` — Monte Carlo engine
- `dwbcCorrectIce.ts`, `themeColors.ts`
- `renderer/` — Canvas rendering (paths / arrows styles)

UI: `client/src/components/` (VisualizationCanvas, ControlPanel, StatisticsPanel, …).
Contexts/hooks: `client/src/contexts/`, `client/src/hooks/` (theme / dark mode).
Persistence: `client/src/lib/storage/` (IndexedDB / localStorage).

## Pre-commit hooks

Husky + lint-staged run ESLint (auto-fix) + Prettier on staged files on every commit. If they
don't fire: `git config core.hooksPath .husky`, then `cd client && npm install`. Emergency
bypass: `git commit --no-verify`.

## Reference material

- Paper: `docs/reference/attached_assets/0502314v1.pdf`
- Reference C impl: `docs/reference/attached_assets/main.c`
- Original spec: `6v-prompt.txt`
- Full SDLC: `CLAUDE.md`
