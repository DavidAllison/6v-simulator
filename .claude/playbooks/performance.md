# Performance — 6v-simulator

The simulator runs Monte Carlo dynamics and renders a lattice to Canvas in the browser, in
real time. Performance work is in-browser performance engineering: keep the frame rate smooth,
keep memory bounded at large N, and keep the flip loop fast — **without breaking the physics
invariants** (see `physics-validation.md`). A faster simulation that changes the dynamics is a
bug, not an optimization.

## What to watch

| Dimension | Target / concern | Where |
|---|---|---|
| **Frame rate** | Stay smooth (aim ~60 fps, never stall the main thread) during a running simulation, including at large N. | render loop, `requestAnimationFrame` cadence |
| **Flip throughput** | Flips/sweeps per second; the hot path is flip detection + acceptance over the flippable-site list. | `physicsFlips.ts`, `optimizedSimulation.ts` |
| **Memory at large N** | Lattice + flippable-site structures scale with N²; avoid per-sweep allocation churn / GC pauses. | `simulation.ts` / `optimizedSimulation.ts` |
| **React re-renders** | The simulation loop must not trigger React re-renders per step; UI updates (stats) should be throttled. | `components/`, `hooks/`, contexts |
| **Canvas draw cost** | Batch draws, minimize per-vertex state changes / path begins; redraw only what changed where possible. | `lib/six-vertex/renderer/` |
| **Bundle size** | Keep the static bundle lean (it's a static site); watch for accidental large deps. | `vite build` output |

## Tooling

```bash
cd client
npm run benchmark         # node runBenchmark.js — headless throughput numbers
npm run test:performance  # jest performance --testTimeout=60000 (timing budgets)
npm run dev               # then open /performance for the in-browser perf demo
npm run build             # inspect dist/ chunk sizes for bundle regressions
```

- **`/performance` route** (`client/src/routes/performanceDemo.tsx`) — interactive harness for
  frame rate / throughput at varying N.
- **Chrome DevTools** — Performance panel for frame timing and long tasks; Memory panel /
  heap snapshots for allocation growth at large N; check for layout thrash and excessive GC.

## Optimization playbook

1. **Measure first.** Use `npm run benchmark` / the `/performance` route / DevTools to find the
   actual bottleneck before changing code. Don't optimize by guess.
2. **Hot path: the flip loop.** Reuse buffers instead of allocating per sweep; keep the
   flippable-site list incremental rather than rebuilt each step. `optimizedSimulation.ts`
   exists for this — extend it rather than slowing the canonical `physicsSimulation.ts`.
3. **Decouple sim from render.** Run many flips per animation frame; render once per frame. Don't
   redraw on every flip.
4. **Throttle React.** Push stats to the UI on an interval / rAF, not per step. Avoid putting the
   live lattice in React state that re-renders the tree.
5. **Canvas.** Minimize state changes (fillStyle/strokeStyle switches), batch same-styled
   segments, and avoid re-drawing static (frozen Arctic) regions when feasible.
6. **Web Workers (when needed).** For large N, offload the simulation loop to a Web Worker so the
   main thread stays responsive for rendering and UI; transfer lattice data efficiently. Start on
   the main thread; move to a worker only when measurement shows the main thread is the limit.
7. **Re-validate physics.** After any optimization, run `npm run test:physics` and confirm the
   ice rule, detailed-balance, and reproducibility still hold. An "optimized" path that diverges
   from `main.c` is wrong.

## Regression guard

`performance.test.ts` encodes timing budgets — keep it green. If an optimization legitimately
shifts a budget, update it deliberately with a note on the measured improvement, and confirm no
physics suite regressed alongside it.
