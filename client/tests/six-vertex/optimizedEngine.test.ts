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
