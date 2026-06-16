/**
 * Worker lifecycle / async-cache regression tests for the simulation facade.
 *
 * The real workerInterface uses `new Worker(new URL(..., import.meta.url))`,
 * which ts-jest (CommonJS) cannot parse — so the facade was historically
 * untestable in Jest. We mock the whole workerInterface module here: the real
 * file is never evaluated (no import.meta), and we get full control over when
 * the async createWorkerSimulation() promise resolves. That lets us exercise
 * the generation-token guard that prevents leaking a worker when a newer
 * initialize()/dispose() lands while creation is still in flight (#69).
 */
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { BoundaryCondition } from '../../src/lib/six-vertex/types';
import type { SimulationParams } from '../../src/lib/six-vertex/types';

// Captured resolvers for each createWorkerSimulation() call, in order. Prefixed
// `mock` so jest's hoisted mock factory may reference it.
const mockResolvers: Array<(w: unknown) => void> = [];

jest.mock('../../src/lib/six-vertex/worker/workerInterface', () => ({
  isWorkerSupported: () => true,
  WorkerSimulation: class {},
  createWorkerSimulation: jest.fn(
    () =>
      new Promise((resolve) => {
        mockResolvers.push(resolve as (w: unknown) => void);
      }),
  ),
}));

// Imported AFTER the mock is registered.
import { MonteCarloSimulation } from '../../src/lib/six-vertex/simulation';

interface FakeWorker {
  stop: jest.Mock;
  terminate: jest.Mock;
  getRawState: jest.Mock;
  getStats: jest.Mock;
  startContinuous: jest.Mock;
  step: jest.Mock;
  setState: jest.Mock;
}

function makeFakeWorker(): FakeWorker {
  return {
    stop: jest.fn(),
    terminate: jest.fn(),
    getRawState: jest.fn(),
    getStats: jest.fn(),
    startContinuous: jest.fn(),
    step: jest.fn(),
    setState: jest.fn(),
  };
}

// A lattice above LARGE_LATTICE_THRESHOLD (128) so worker mode engages.
const SIZE = 256;
const params: SimulationParams = {
  temperature: 1,
  beta: 1,
  weights: { a1: 1, a2: 1, b1: 1, b2: 1, c1: 1, c2: 1 },
  boundaryCondition: BoundaryCondition.DWBC,
  dwbcConfig: { type: 'high' },
  seed: 7,
};

// Flush both microtasks (promise .then) and the macrotask queue.
const flush = () => new Promise((r) => setTimeout(r, 0));

describe('worker async-init generation guard (#69)', () => {
  beforeEach(() => {
    mockResolvers.length = 0;
  });

  it('terminates a worker that resolves after dispose() (no leak)', async () => {
    const sim = new MonteCarloSimulation({ seed: 7 }, { useWorker: true, useOptimized: true });
    sim.initialize(SIZE, SIZE, params);
    expect(mockResolvers).toHaveLength(1);

    // Controller is discarded before the worker finishes spinning up.
    sim.dispose();

    const stale = makeFakeWorker();
    mockResolvers[0](stale);
    await flush();

    // The late worker must be stopped + terminated, never adopted.
    expect(stale.terminate).toHaveBeenCalledTimes(1);
    expect(stale.startContinuous).not.toHaveBeenCalled();
  });

  it('terminates the superseded worker when initialize() runs again', async () => {
    const sim = new MonteCarloSimulation({ seed: 7 }, { useWorker: true, useOptimized: true });
    sim.initialize(SIZE, SIZE, params); // generation 1
    sim.initialize(SIZE, SIZE, params); // generation 2 supersedes 1
    expect(mockResolvers).toHaveLength(2);

    const first = makeFakeWorker();
    const second = makeFakeWorker();

    mockResolvers[0](first);
    await flush();
    expect(first.terminate).toHaveBeenCalledTimes(1); // stale → killed

    mockResolvers[1](second);
    await flush();
    expect(second.terminate).not.toHaveBeenCalled(); // current → adopted
    expect(second.getRawState).toHaveBeenCalled(); // seeded the cache
  });

  it('honours a run() requested before the worker finished initializing', async () => {
    const sim = new MonteCarloSimulation({ seed: 7 }, { useWorker: true, useOptimized: true });
    sim.initialize(SIZE, SIZE, params);

    // User presses Run while the worker is still being created.
    void sim.run(Number.MAX_SAFE_INTEGER);

    const worker = makeFakeWorker();
    mockResolvers[0](worker);
    await flush();

    expect(worker.terminate).not.toHaveBeenCalled();
    expect(worker.startContinuous).toHaveBeenCalled(); // pending run honoured
  });
});
