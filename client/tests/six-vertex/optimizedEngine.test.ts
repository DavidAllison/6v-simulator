import { describe, it, expect } from '@jest/globals';
// Drive the SHIPPING engine directly (OptimizedPhysicsSimulation / FastRNG).
// The older heatBath/equilibrium/reproducibility suites exercise a different,
// non-shipping code path (physicsSimulation + SeededRNG), so they never caught
// the FastRNG range bug (#68). These tests cover the real engine.
import { OptimizedPhysicsSimulation } from '../../src/lib/six-vertex/optimizedSimulation';

const EQUAL = { a1: 1, a2: 1, b1: 1, b2: 1, c1: 1, c2: 1 };
const C_DOMINANT = { a1: 1, a2: 1, b1: 1, b2: 1, c1: 5, c2: 5 };
const A_DOMINANT = { a1: 5, a2: 5, b1: 1, b2: 1, c1: 1, c2: 1 };

// The engine's RNG is private; exercise it indirectly through nextInt-driven
// behavior by asserting the engine never produces out-of-range vertex types and
// makes progress. For a direct range check we reach the private rng via a cast —
// this is a white-box regression guard for the #68 fix.
describe('FastRNG range (#68 regression)', () => {
  it('next() stays in [0, 1) and nextInt(max) in [0, max) over many draws', () => {
    const sim = new OptimizedPhysicsSimulation({ size: 8, weights: EQUAL, seed: 42 });
    // Access the private FastRNG instance for a direct distribution check.
    const rng = (sim as unknown as { rng: { next(): number; nextInt(n: number): number } }).rng;
    let maxV = 0;
    let geOne = 0;
    let oob = 0;
    const N = 200000;
    for (let i = 0; i < N; i++) {
      const v = rng.next();
      if (v > maxV) maxV = v;
      if (v >= 1) geOne++;
      const k = rng.nextInt(10);
      if (k < 0 || k >= 10) oob++;
    }
    expect(geOne).toBe(0);
    expect(maxV).toBeLessThan(1);
    expect(maxV).toBeGreaterThan(0.9); // still spans the range
    expect(oob).toBe(0);
  });
});

describe('OptimizedPhysicsSimulation evolves (no freeze)', () => {
  it('accepts flips and changes configuration at the ice point', () => {
    const sim = new OptimizedPhysicsSimulation({ size: 24, weights: EQUAL, seed: 7 });
    const before = sim.getRawState();
    sim.run(20000);
    const stats = sim.getStats();
    const after = sim.getRawState();
    expect(stats.successfulFlips).toBeGreaterThan(0);
    expect(stats.acceptanceRate).toBeGreaterThan(0);
    let changed = 0;
    for (let i = 0; i < before.length; i++) if (before[i] !== after[i]) changed++;
    expect(changed).toBeGreaterThan(0);
  });

  it('does NOT freeze under c-dominant weights (the #68 symptom)', () => {
    const sim = new OptimizedPhysicsSimulation({
      size: 16,
      weights: C_DOMINANT,
      seed: 7,
      initialState: 'dwbc-high',
    });
    sim.run(20000);
    const stats = sim.getStats();
    // Before the fix this froze: 0 successful flips, acceptanceRate 0.
    expect(stats.successfulFlips).toBeGreaterThan(0);
    expect(stats.acceptanceRate).toBeGreaterThan(0);
  });

  it('evolves under a-dominant weights too', () => {
    const sim = new OptimizedPhysicsSimulation({
      size: 16,
      weights: A_DOMINANT,
      seed: 11,
      initialState: 'dwbc-low',
    });
    sim.run(20000);
    expect(sim.getStats().successfulFlips).toBeGreaterThan(0);
  });
});

describe('reproducibility of the shipping engine', () => {
  it('same seed -> identical trajectory', () => {
    const a = new OptimizedPhysicsSimulation({ size: 32, weights: EQUAL, seed: 12345 });
    const b = new OptimizedPhysicsSimulation({ size: 32, weights: EQUAL, seed: 12345 });
    a.run(5000);
    b.run(5000);
    const ra = a.getRawState();
    const rb = b.getRawState();
    expect(ra.length).toBe(rb.length);
    let diff = 0;
    for (let i = 0; i < ra.length; i++) if (ra[i] !== rb[i]) diff++;
    expect(diff).toBe(0);
  });

  it('different seeds -> different trajectories', () => {
    const a = new OptimizedPhysicsSimulation({ size: 32, weights: EQUAL, seed: 1 });
    const b = new OptimizedPhysicsSimulation({ size: 32, weights: EQUAL, seed: 2 });
    a.run(5000);
    b.run(5000);
    const ra = a.getRawState();
    const rb = b.getRawState();
    let diff = 0;
    for (let i = 0; i < ra.length; i++) if (ra[i] !== rb[i]) diff++;
    expect(diff).toBeGreaterThan(0);
  });
});

describe('equilibrium responds correctly to weights (#69 acceptance rule)', () => {
  // A correct sampler MUST increase a vertex type's equilibrium fraction when its
  // weight is favored. The old acceptance rule (min(1, ratio/maxWeight)) did the
  // opposite: favoring c/a produced FEWER of them and froze (acceptance ~0).
  const cFraction = (sim: OptimizedPhysicsSimulation) => {
    const v = sim.getStats().vertexCounts;
    const t = v.a1 + v.a2 + v.b1 + v.b2 + v.c1 + v.c2;
    return (v.c1 + v.c2) / t;
  };
  const aFraction = (sim: OptimizedPhysicsSimulation) => {
    const v = sim.getStats().vertexCounts;
    const t = v.a1 + v.a2 + v.b1 + v.b2 + v.c1 + v.c2;
    return (v.a1 + v.a2) / t;
  };
  const run = (weights: typeof EQUAL, seed = 7) => {
    const sim = new OptimizedPhysicsSimulation({
      size: 32,
      weights,
      seed,
      initialState: 'dwbc-high',
    });
    sim.run(300000);
    return sim;
  };

  it('favoring c-vertices increases the c fraction (and keeps acceptance > 0)', () => {
    const ice = run(EQUAL);
    const cdom = run(C_DOMINANT);
    expect(cFraction(cdom)).toBeGreaterThan(cFraction(ice));
    expect(cdom.getStats().acceptanceRate).toBeGreaterThan(0);
  });

  it('favoring a-vertices increases the a fraction (and keeps acceptance > 0)', () => {
    const ice = run(EQUAL);
    const adom = run(A_DOMINANT);
    expect(aFraction(adom)).toBeGreaterThan(aFraction(ice));
    expect(adom.getStats().acceptanceRate).toBeGreaterThan(0);
  });
});

describe('energy stat is finite when a vertex type has weight 0 (#69)', () => {
  it('does not return NaN energy for an absent zero-weight type', () => {
    // DWBC-low contains only a1/a2/c2 — no b vertices. Setting b weights to 0
    // means count=0 AND weight=0, which previously computed 0 * ln(0) = NaN and
    // poisoned the whole energy readout.
    const sim = new OptimizedPhysicsSimulation({
      size: 8,
      weights: { a1: 1, a2: 1, b1: 0, b2: 0, c1: 1, c2: 1 },
      seed: 1,
      initialState: 'dwbc-low',
    });
    const energy = sim.getStats().energy;
    expect(Number.isNaN(energy)).toBe(false);
    expect(Number.isFinite(energy)).toBe(true);
  });

  it('stays finite after stepping with a zero-weight absent type', () => {
    const sim = new OptimizedPhysicsSimulation({
      size: 8,
      weights: { a1: 2, a2: 2, b1: 0, b2: 0, c1: 1, c2: 1 },
      seed: 7,
      initialState: 'dwbc-low',
    });
    sim.run(5000);
    const energy = sim.getStats().energy;
    expect(Number.isNaN(energy)).toBe(false);
  });
});

describe('single-step contract shared by main-thread and worker step (#69)', () => {
  it('run(1) advances the step counter by exactly one', () => {
    const sim = new OptimizedPhysicsSimulation({
      size: 16,
      weights: EQUAL,
      seed: 3,
      initialState: 'dwbc-high',
    });
    expect(sim.getStats().step).toBe(0);
    sim.run(1);
    expect(sim.getStats().step).toBe(1);
    sim.run(1);
    expect(sim.getStats().step).toBe(2);
  });
});
