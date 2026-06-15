# Issue / PR Title Framing

Every issue and PR title should be **understandable to someone who isn't deep in the code** —
lead with the plain-English outcome, put file paths, symbols, and jargon after the em dash.

## Anatomy

```
<plain-English outcome> — <technical detail or issue ref>
```

The part before the em dash says *what changes for a user or for the simulation's correctness*.
The part after is the engineering hook. This applies to **every** issue/PR — including chores,
refactors, and dependency bumps.

## Examples (6v-simulator)

### Good

- "DWBC-High initial state now matches paper Fig. 2 — fix c₂ anti-diagonal in `initialStates.ts` (#41)"
- "Flips no longer break the ice rule at the boundary — guard 2×2 neighborhood in `physicsFlips.ts` (#37)"
- "Same seed now reproduces the same run — deterministic PRNG ordering in `rng.ts` (#52)"
- "Large lattices (N=64) stay above 30 fps — Web Worker offload + Canvas batching (#58)"
- "Path-render mode matches the paper's bold-segment style — `renderer/pathRenderer.ts` (#29)"
- "Dark mode panels are readable — theme tokens in `themeColors.ts` (#30)"

### Bad — rejected

- "Fix `physicsFlips.ts` line 142" — engineer-only framing, no outcome.
- "[#41] dwbc fix" — no outcome stated.
- "chore: bump deps" — no outcome stated.
- "WIP" / "refactor stuff" — meaningless.
- "Address review findings" — too vague; what actually gets fixed?

## Quick check before opening

1. Read the title aloud — does it say what changes, or just where?
2. Is there a real outcome before the em dash?
3. Is the technical hook (file, symbol, issue #) **after** the em dash?

If any answer is no, fix the title before submitting.

## Closing keywords

`Closes #N` / `Fixes #N` are for **same-repo, intended** closure in the PR body footer — that's
the SDLC convention. This is a single repo, so cross-repo closing-keyword footguns don't apply
here; just don't put `Closes #N` in a PR that doesn't actually resolve issue N.
