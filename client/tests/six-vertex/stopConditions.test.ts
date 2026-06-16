import { describe, it, expect } from '@jest/globals';
import {
  allConverged,
  combineStop,
  divergenceExceeded,
  heightObservable,
  manual,
  maxSteps,
  relativeSpread,
  type NSimSnapshot,
  type StopContext,
} from '../../src/lib/six-vertex/stopConditions';
import { VertexType, type SimulationStats } from '../../src/lib/six-vertex/types';

function makeStats(overrides: Partial<SimulationStats> = {}): SimulationStats {
  return {
    step: 0,
    energy: 0,
    vertexCounts: {
      [VertexType.a1]: 0,
      [VertexType.a2]: 0,
      [VertexType.b1]: 0,
      [VertexType.b2]: 0,
      [VertexType.c1]: 0,
      [VertexType.c2]: 0,
    },
    acceptanceRate: 0,
    flipAttempts: 0,
    successfulFlips: 0,
    beta: 1,
    ...overrides,
  };
}

function snapshot(observable: number, step = 0): NSimSnapshot {
  return { step, observable, stats: makeStats({ step }) };
}

/** Build a StopContext whose per-instance history is a constant value repeated. */
function ctxFromConstantHistories(values: number[], samples: number, step = 1000): StopContext {
  const history = values.map((v) => Array(samples).fill(v));
  const instances = values.map((v) => snapshot(v, step));
  return { step, instances, history };
}

describe('relativeSpread', () => {
  it('is 0 for identical values', () => {
    expect(relativeSpread([5, 5, 5])).toBe(0);
  });

  it('is scale-free: (max-min)/mean', () => {
    // [9, 11] -> spread 2, mean 10 -> 0.2
    expect(relativeSpread([9, 11])).toBeCloseTo(0.2, 10);
  });

  it('returns 0 for an empty set', () => {
    expect(relativeSpread([])).toBe(0);
  });
});

describe('heightObservable', () => {
  it('prefers stats.height when present', () => {
    expect(heightObservable(makeStats({ height: 42 }))).toBe(42);
  });

  it('falls back to the c2 vertex count', () => {
    const stats = makeStats();
    stats.vertexCounts[VertexType.c2] = 7;
    expect(heightObservable(stats)).toBe(7);
  });
});

describe('maxSteps', () => {
  it('does not fire below the threshold', () => {
    const { predicate } = maxSteps(100);
    expect(predicate({ step: 99, instances: [], history: [] })).toBe(false);
  });

  it('fires exactly at the threshold (boundary)', () => {
    const { predicate } = maxSteps(100);
    expect(predicate({ step: 100, instances: [], history: [] })).toBe(true);
  });

  it('fires above the threshold', () => {
    const { predicate } = maxSteps(100);
    expect(predicate({ step: 101, instances: [], history: [] })).toBe(true);
  });
});

describe('allConverged', () => {
  it('fires when histories are tight across the full window', () => {
    const { predicate } = allConverged({ threshold: 0.05, window: 30 });
    // Two instances within 1% of each other for 30 samples.
    const ctx = ctxFromConstantHistories([100, 100.5], 30);
    expect(predicate(ctx)).toBe(true);
  });

  it('does not fire before the window has filled', () => {
    const { predicate } = allConverged({ threshold: 0.05, window: 30 });
    const ctx = ctxFromConstantHistories([100, 100], 29); // tight but only 29 samples
    expect(predicate(ctx)).toBe(false);
  });

  it('does not fire when convergence is only brief (last sample tight, earlier wide)', () => {
    const { predicate } = allConverged({ threshold: 0.05, window: 3 });
    // window of 3: samples [wide, wide, tight] -> must not stop.
    const history = [
      [100, 100, 100],
      [200, 150, 100.5],
    ];
    const instances = [snapshot(100), snapshot(100.5)];
    expect(predicate({ step: 999, instances, history })).toBe(false);
  });

  it('fires when the last window is tight even if older samples were wide', () => {
    const { predicate } = allConverged({ threshold: 0.05, window: 2 });
    const history = [
      [500, 100, 100], // last 2: 100,100
      [100, 100, 100.5], // last 2: 100,100.5
    ];
    const instances = [snapshot(100), snapshot(100.5)];
    expect(predicate({ step: 999, instances, history })).toBe(true);
  });

  it('returns false with fewer than 2 instances (cannot converge alone)', () => {
    const { predicate } = allConverged({ threshold: 0.05, window: 5 });
    const ctx = ctxFromConstantHistories([100], 50);
    expect(predicate(ctx)).toBe(false);
  });

  it('does not fire when instances stay far apart', () => {
    const { predicate } = allConverged({ threshold: 0.05, window: 10 });
    const ctx = ctxFromConstantHistories([100, 200], 30);
    expect(predicate(ctx)).toBe(false);
  });
});

describe('divergenceExceeded', () => {
  it('fires when current relative spread meets the threshold', () => {
    const { predicate } = divergenceExceeded({ threshold: 0.2 });
    // [80, 120] -> spread 40, mean 100 -> 0.4 >= 0.2
    const instances = [snapshot(80), snapshot(120)];
    expect(predicate({ step: 10, instances, history: [] })).toBe(true);
  });

  it('does not fire when instances are close', () => {
    const { predicate } = divergenceExceeded({ threshold: 0.5 });
    const instances = [snapshot(100), snapshot(101)];
    expect(predicate({ step: 10, instances, history: [] })).toBe(false);
  });

  it('returns false with fewer than 2 instances', () => {
    const { predicate } = divergenceExceeded({ threshold: 0.01 });
    expect(predicate({ step: 10, instances: [snapshot(100)], history: [] })).toBe(false);
  });
});

describe('manual', () => {
  it('never fires', () => {
    const { predicate } = manual();
    expect(predicate(ctxFromConstantHistories([100, 100], 1000))).toBe(false);
  });
});

describe('combineStop', () => {
  const yes = () => true;
  const no = () => false;
  const empty: StopContext = { step: 0, instances: [], history: [] };

  it('any: fires if at least one predicate fires', () => {
    expect(combineStop([no, yes, no], 'any')(empty)).toBe(true);
    expect(combineStop([no, no], 'any')(empty)).toBe(false);
  });

  it('all: fires only when every predicate fires', () => {
    expect(combineStop([yes, yes], 'all')(empty)).toBe(true);
    expect(combineStop([yes, no], 'all')(empty)).toBe(false);
  });

  it('empty predicate list never stops', () => {
    expect(combineStop([], 'any')(empty)).toBe(false);
    expect(combineStop([], 'all')(empty)).toBe(false);
  });
});
