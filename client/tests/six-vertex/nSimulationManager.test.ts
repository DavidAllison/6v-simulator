/**
 * NSimulationManager: the snapshot-reuse contract behind the N-sim tick perf fix.
 *
 * pushHistory / getRelativeSpread / getStep / evaluateStop all accept a
 * pre-computed snapshot array so the render loop can sweep getStats() ONCE per
 * frame instead of ~5×. These tests pin that the optional-arg results match the
 * compute-internally results, and that reusing snapshots really does avoid the
 * extra getStats() passes.
 */

// simulation.ts transitively imports the worker interface, whose real source
// uses `new Worker(new URL(..., import.meta.url))` — ts-jest (CommonJS) can't
// parse that. A factory mock means the real file is never evaluated. These
// tests use small (size=6) synchronous lattices, so the worker is never used.
jest.mock('../../src/lib/six-vertex/worker/workerInterface', () => ({
  isWorkerSupported: () => false,
  WorkerSimulation: class {},
  createWorkerSimulation: jest.fn(),
}));

import { describe, it, expect, jest } from '@jest/globals';
import { NSimulationManager } from '../../src/lib/six-vertex/nSimulation';
import type { NSimConfig } from '../../src/lib/six-vertex/nSimulation';
import { manual, maxSteps } from '../../src/lib/six-vertex/stopConditions';

function makeManager(): NSimulationManager {
  const config: NSimConfig = {
    size: 6, // small -> synchronous optimized engine, no worker
    temperature: 1.0,
    weights: { a1: 1, a2: 1, b1: 1, b2: 1, c1: 1, c2: 1 },
    instances: [
      { id: 'a', label: 'A', initialState: 'dwbc-high', seed: 1 },
      { id: 'b', label: 'B', initialState: 'dwbc-low', seed: 2 },
      { id: 'c', label: 'C', initialState: 'random', seed: 3 },
    ],
  };
  return new NSimulationManager(config);
}

describe('NSimulationManager snapshot reuse', () => {
  it('pushHistory returns the snapshots it used and appends one sample per instance', () => {
    const m = makeManager();
    const snaps = m.pushHistory();
    expect(snaps).toHaveLength(3);
    expect(m.getHistory().map((s) => s.length)).toEqual([1, 1, 1]);

    // Passing snapshots back in appends another sample without recomputing.
    m.pushHistory(snaps);
    expect(m.getHistory().map((s) => s.length)).toEqual([2, 2, 2]);
  });

  it('getRelativeSpread / getStep give the same answer with or without passed snapshots', () => {
    const m = makeManager();
    const snaps = m.getSnapshots();
    expect(m.getRelativeSpread(snaps)).toBe(m.getRelativeSpread());
    expect(m.getStep(snaps)).toBe(m.getStep());
  });

  it('evaluateStop gives the same verdict with or without passed snapshots', () => {
    const m = makeManager();
    const snaps = m.getSnapshots();
    // manual() never stops; maxSteps(0) stops immediately — both convention-independent.
    expect(m.evaluateStop(manual().predicate, snaps)).toBe(m.evaluateStop(manual().predicate));
    expect(m.evaluateStop(maxSteps(0).predicate, snaps)).toBe(true);
  });

  it('reusing one snapshot sweep calls getStats exactly once per instance', () => {
    const m = makeManager();
    const spies = m.getControllers().map((c) => jest.spyOn(c, 'getStats'));

    // The render-loop pattern: sweep once, then reuse everywhere.
    const snaps = m.getSnapshots();
    m.pushHistory(snaps);
    m.getRelativeSpread(snaps);
    m.getStep(snaps);
    m.evaluateStop(maxSteps(1_000_000).predicate, snaps);

    for (const spy of spies) {
      expect(spy).toHaveBeenCalledTimes(1); // the single getSnapshots() sweep
    }
  });

  it('NOT reusing snapshots costs multiple getStats sweeps (documents the old hot path)', () => {
    const m = makeManager();
    const spies = m.getControllers().map((c) => jest.spyOn(c, 'getStats'));

    m.pushHistory(); // sweep 1
    m.getRelativeSpread(); // sweep 2
    m.getStep(); // sweep 3
    m.evaluateStop(maxSteps(1_000_000).predicate); // sweep 4 (+ getStep inside -> 5)

    for (const spy of spies) {
      expect(spy.mock.calls.length).toBeGreaterThan(1);
    }
  });
});
