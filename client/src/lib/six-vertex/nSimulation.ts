/**
 * N-simulation manager: orchestrates an arbitrary number of independent
 * 6-vertex Monte Carlo simulations that share lattice size / temperature /
 * weights but differ in initial condition and seed, and tracks how their
 * macroscopic observables converge.
 *
 * This is the unified core that subsumes the single (N=1) and dual (N=2)
 * cases. It is engine- and UI-agnostic: it builds one SimulationController per
 * instance via createSimulation, exposes those controllers so a React route can
 * subscribe for redraws, and keeps per-instance observable history plus a
 * StopContext for evaluating composable stop conditions.
 *
 * Worker-async model (matches simulation.ts): for large lattices each
 * controller runs its Monte Carlo loop in a Web Worker and pushes stats + raw
 * snapshots via events. The manager does NOT poll the workers; the route drives
 * a requestAnimationFrame tick that subscribes to each controller (for redraw),
 * and periodically calls pushHistory() + evaluateStop(). getSnapshots()/getStats
 * read each controller's synchronous cache, which the worker keeps fresh.
 */

import { createSimulation, LARGE_LATTICE_THRESHOLD } from './simulation';
import type { SimulationConfig } from './simulation';
import { BoundaryCondition } from './types';
import type { SimulationController, SimulationParams } from './types';
import { heightObservable, relativeSpread } from './stopConditions';
import type { NSimSnapshot, StopContext, StopPredicate } from './stopConditions';

export type NSimInitialState = 'dwbc-high' | 'dwbc-low' | 'random';

export interface NSimInstanceConfig {
  id: string;
  label: string;
  initialState: NSimInitialState;
  seed: number;
}

export interface NSimWeights {
  a1: number;
  a2: number;
  b1: number;
  b2: number;
  c1: number;
  c2: number;
}

export interface NSimConfig {
  size: number;
  temperature: number;
  weights: NSimWeights;
  instances: NSimInstanceConfig[];
}

/** Cap on per-instance observable history so memory stays bounded over a long run. */
const MAX_HISTORY = 200;

const WORKER_CONFIG: SimulationConfig = {
  useOptimized: true,
  useWorker: true,
  workerThreshold: 50,
};

function paramsForInstance(config: NSimConfig, instance: NSimInstanceConfig): SimulationParams {
  const isDwbc = instance.initialState !== 'random';
  return {
    temperature: config.temperature,
    beta: 1.0 / config.temperature,
    weights: { ...config.weights },
    boundaryCondition: isDwbc ? BoundaryCondition.DWBC : BoundaryCondition.Open,
    dwbcConfig: isDwbc
      ? { type: instance.initialState === 'dwbc-high' ? 'high' : 'low' }
      : undefined,
    seed: instance.seed,
  };
}

export class NSimulationManager {
  private config: NSimConfig;
  private controllers: SimulationController[] = [];
  private history: number[][] = [];

  constructor(config: NSimConfig) {
    this.config = { ...config, weights: { ...config.weights }, instances: [...config.instances] };
    this.build();
  }

  private build(): void {
    this.controllers = this.config.instances.map((instance) => {
      const params = paramsForInstance(this.config, instance);
      const controller = createSimulation(params, WORKER_CONFIG);
      controller.initialize(this.config.size, this.config.size, params);
      return controller;
    });
    this.history = this.config.instances.map(() => []);
  }

  /** Expose the controllers so the route can subscribe for per-instance redraws. */
  getControllers(): SimulationController[] {
    return this.controllers;
  }

  getInstanceConfigs(): NSimInstanceConfig[] {
    return this.config.instances;
  }

  getSize(): number {
    return this.config.size;
  }

  /** Large lattices render via the raw bitmap path rather than the object form. */
  isLarge(): boolean {
    return this.config.size > LARGE_LATTICE_THRESHOLD;
  }

  /** Step every instance once. */
  step(): void {
    for (const controller of this.controllers) {
      controller.step();
    }
  }

  /** Start every instance running (worker continuous loop for large lattices). */
  run(): void {
    for (const controller of this.controllers) {
      void controller.run(Number.MAX_SAFE_INTEGER);
    }
  }

  pause(): void {
    for (const controller of this.controllers) {
      controller.pause();
    }
  }

  /** Reset every instance to its seeded initial state and clear history. */
  reset(): void {
    for (const controller of this.controllers) {
      controller.reset();
    }
    this.history = this.config.instances.map(() => []);
  }

  /** Terminate every controller (and its Web Worker) so nothing leaks. */
  dispose(): void {
    for (const controller of this.controllers) {
      controller.dispose?.();
    }
    this.controllers = [];
  }

  /** Latest step + observable + stats for each instance. */
  getSnapshots(): NSimSnapshot[] {
    return this.controllers.map((controller) => {
      const stats = controller.getStats();
      return { step: stats.step, observable: heightObservable(stats), stats };
    });
  }

  /**
   * Append the current observables to each instance's history (capped).
   * Accepts pre-computed snapshots so a caller already holding them (e.g. the
   * render loop) doesn't trigger another full getStats() sweep. Returns the
   * snapshots used, so the caller can reuse them for readouts + stop checks.
   */
  pushHistory(snapshots: NSimSnapshot[] = this.getSnapshots()): NSimSnapshot[] {
    for (let i = 0; i < snapshots.length; i++) {
      if (!this.history[i]) this.history[i] = [];
      const series = this.history[i];
      series.push(snapshots[i].observable);
      if (series.length > MAX_HISTORY) {
        series.shift();
      }
    }
    return snapshots;
  }

  /** Copy of the per-instance observable history (oldest -> newest). */
  getHistory(): number[][] {
    return this.history.map((series) => [...series]);
  }

  /** Current cross-instance relative spread (the live convergence readout). */
  getRelativeSpread(snapshots: NSimSnapshot[] = this.getSnapshots()): number {
    return relativeSpread(snapshots.map((s) => s.observable));
  }

  /** Max step across instances (used as the global step for stop conditions). */
  getStep(snapshots: NSimSnapshot[] = this.getSnapshots()): number {
    return snapshots.reduce((max, s) => Math.max(max, s.step), 0);
  }

  private buildStopContext(snapshots: NSimSnapshot[]): StopContext {
    return {
      step: this.getStep(snapshots),
      instances: snapshots,
      history: this.history,
    };
  }

  /** Evaluate a stop predicate against the current snapshots + history. */
  evaluateStop(predicate: StopPredicate, snapshots: NSimSnapshot[] = this.getSnapshots()): boolean {
    return predicate(this.buildStopContext(snapshots));
  }
}
