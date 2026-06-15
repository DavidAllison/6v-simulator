# Physics Validation — 6v-simulator

**This is the most important playbook in the repo.** The whole project's value is that the
simulation is *physically faithful* to the 6-vertex model with Domain Wall Boundary Conditions
as described in the paper and the reference C implementation. Every change to the physics core
must be validated against the invariants below.

## Source of truth (defer to these, in order)

1. **The paper** — `docs/reference/attached_assets/0502314v1.pdf`
   ("Numerical study of the 6-vertex model with DWBC", Allison & Reshetikhin, 2005). Figures 1
   (vertex types), 2 & 3 (DWBC configurations) are the canonical references.
2. **The reference C implementation** — `docs/reference/attached_assets/main.c`. The correct
   flip dynamics, weight calculations, and Monte Carlo loop. When TS behavior and `main.c`
   disagree, `main.c` wins.
3. **The `physics-validator` agent** (`.claude/agents/physics-validator.md`) — dispatch it to
   audit any physics-touching change against this checklist.
4. **The `/dwbc-verify` route** — the visual gate: it must render initial states that match the
   paper figures.

When physics is in question, do **not** guess or "make it look right." Read the paper section
and the corresponding `main.c` code, then make the TS match.

---

## The invariants (validation checklist)

### 1. Ice rule (the #1 property)
Every vertex has **exactly 2 incoming and 2 outgoing arrows**. This must hold:
- in every generated initial state, and
- after **every** flip / transformation, at every cell including the boundary.

Validate: `client/tests/six-vertex/iceRuleValidation.test.ts`. Any flip code change
(`flips.ts`, `physicsFlips.ts`, `correctedFlipLogic.ts`, `cStyleFlipLogic.ts`) must keep this
green. A flip that produces a 3-in/1-out (or 1-in/3-out) vertex is a hard BLOCK.

### 2. The six vertex types match Fig. 1
`VertexType` = a₁, a₂, b₁, b₂, c₁, c₂. Each maps to a specific pair of bold (occupied) edges /
arrow configuration in the paper's Fig. 1.
- Defined in `client/src/lib/six-vertex/types.ts`
- Bold-edge mapping in `client/src/lib/six-vertex/vertexShapes.ts`

Validate: `vertexShapes.test.ts`, `types.test.ts`. Compare the mapping cell-by-cell against
Fig. 1 — do not rely on intuition about which type "looks" right.

### 3. DWBC High / Low initial states match Fig. 2 / 3
- **High**: c₂ vertices on the **anti-diagonal**; vertical-dominant upper-left,
  horizontal-dominant lower-right.
- **Low**: c₂ vertices on the **main diagonal**; a₁ region upper-right, a₂ region lower-left.

Generated in `client/src/lib/six-vertex/initialStates.ts` (see also `dwbcCorrectIce.ts`).
Validate: `initialStates.test.ts` (covers N=8 and N=24) and the `/dwbc-verify` route visually
against Fig. 2/3. The generated state must itself satisfy the ice rule at every cell.

### 4. Flip dynamics — 2×2, heat-bath / detailed balance
- Flips act on a **2×2 neighborhood**, not a single cell.
- Acceptance uses the **heat-bath / detailed-balance** rule with vertex weights as computed in
  `main.c` (weights a, b, c per the model). The TS weight math must reproduce `main.c`.
- Maintain the flippable-site list and track success/failure rates.

Code: `flips.ts` / `physicsFlips.ts` / `cStyleFlipLogic.ts` / `correctedFlipLogic.ts`;
engine in `simulation.ts` / `physicsSimulation.ts` / `optimizedSimulation.ts`.
Validate: `physicsFlips.test.ts`, `heatBath.test.ts`. Step through individual flips on the
`/flip-debug` route to confirm the 2×2 transformation and ice-rule preservation by eye.

### 5. Reproducibility — seeded RNG
The PRNG (`client/src/lib/six-vertex/rng.ts`) is seeded; the **same seed must produce the same
run**. This is the basis of every deterministic test. A change that alters RNG draw order or
consumption (even if "statistically equivalent") breaks reproducibility and the test suite.
Validate: `reproducibility.test.ts`, `rng.test.ts`.

### 6. Equilibrium & Arctic-curve expectations
Over a long run from DWBC, the system should equilibrate toward the expected statistics, with a
**frozen (Arctic) region** outside the Arctic curve and a disordered region inside — the
qualitative phenomenology of the paper. Use this as a sanity check, not an exact unit assertion.
Validate: `equilibrium.test.ts`; visually, run the simulator from a DWBC state at large N and
confirm the Arctic-curve separation emerges.

---

## How to validate a physics change

1. Identify which invariants the change can affect (use the checklist above).
2. Read the relevant paper section + the corresponding `main.c` code. Make the TS match.
3. Run `npm run test:physics` (from `client/`), then the specific suites for the touched
   invariants. Add/extend tests if the change isn't already covered.
4. For initial-state / rendering changes, eyeball `/dwbc-verify` (and `/flip-debug` for flips)
   against the figures.
5. Dispatch the `physics-validator` agent for an independent audit, citing `file:line` and the
   paper/`main.c` reference for each finding.
6. A physics regression with no failing test is a **test gap** — add the test that would have
   caught it.

## Red flags

- Editing flip logic without a corresponding ice-rule assertion.
- "Fixing" a visual to match a figure by hand without checking the underlying vertex types.
- Changing RNG usage and updating snapshots/expected values to make tests pass — confirm the
  *physics* is still right, not just that the numbers shifted.
- Diverging from `main.c`'s weight math "because it reads cleaner."
