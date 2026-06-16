/**
 * Composable stop / convergence conditions for the N-simulation system.
 *
 * Everything here is a PURE function over a snapshot context so the conditions
 * are trivially unit-testable without spinning up any Monte Carlo engine. The
 * N-simulation manager (nSimulation.ts) builds a StopContext from its live
 * controllers and evaluates a StopPredicate each tick; the route surfaces the
 * result (auto-stop + "Converged at step N" badge).
 */

import type { SimulationStats } from './types';

/** Latest observed sample for a single simulation instance. */
export interface NSimSnapshot {
  step: number;
  observable: number;
  stats: SimulationStats;
}

/**
 * Everything a stop predicate needs to decide. `instances` is the latest
 * snapshot per instance (parallel to `history`); `history` is the per-instance
 * observable history (oldest -> newest), one inner array per instance.
 */
export interface StopContext {
  step: number;
  instances: NSimSnapshot[];
  history: number[][];
}

export type StopPredicate = (ctx: StopContext) => boolean;

/** A user-selectable stop condition with display metadata. */
export interface StopConditionDescriptor {
  id: string;
  label: string;
  predicate: StopPredicate;
}

/** Avoid division-by-zero when the observable mean is ~0. */
const EPSILON = 1e-9;

/**
 * Macroscopic observable used to compare instances: the c₂ vertex count. The
 * optimized engine reports this incrementally as `stats.height` (a scalar order
 * parameter, NOT the model's 2D height function); we fall back to the directly
 * counted c₂ total when that field is absent. It is a COARSE proxy for the
 * macroscopic configuration; relative spread (below) handles its scale, so no
 * normalization is needed.
 */
export function heightObservable(stats: SimulationStats): number {
  if (typeof stats.height === 'number') {
    return stats.height;
  }
  return stats.vertexCounts.c2;
}

/**
 * Relative spread of a set of values: (max - min) / max(mean, EPSILON).
 * 0 means all equal; larger means more disagreement. Scale-free, so it works
 * across lattice sizes without normalizing the observable.
 */
export function relativeSpread(values: number[]): number {
  if (values.length === 0) return 0;
  let min = values[0];
  let max = values[0];
  let sum = 0;
  for (const v of values) {
    if (v < min) min = v;
    if (v > max) max = v;
    sum += v;
  }
  const mean = sum / values.length;
  return (max - min) / Math.max(Math.abs(mean), EPSILON);
}

/** Stop once the (max/global) step count reaches `n`. */
export function maxSteps(n: number): StopConditionDescriptor {
  return {
    id: 'max-steps',
    label: `Max steps (${n})`,
    predicate: (ctx) => ctx.step >= n,
  };
}

/**
 * Stop once every instance's observable has stayed mutually tight (relative
 * spread <= threshold) for an entire window of recent samples. Requires:
 *  - at least 2 instances (one sim cannot "converge with others");
 *  - at least `window` samples of history (so it can't fire before warming up);
 *  - the cross-instance relative spread to be <= threshold for EVERY one of the
 *    last `window` samples (a single brief dip is not enough).
 */
export function allConverged(
  options: { threshold?: number; window?: number } = {},
): StopConditionDescriptor {
  const threshold = options.threshold ?? 0.05;
  const window = options.window ?? 30;
  return {
    id: 'all-converged',
    label: `All converged (≤${(threshold * 100).toFixed(0)}% over ${window})`,
    predicate: (ctx) => {
      const series = ctx.history;
      if (series.length < 2) return false;
      const lengths = series.map((s) => s.length);
      const minLen = Math.min(...lengths);
      if (minLen < window) return false;

      for (let offset = 0; offset < window; offset++) {
        const idx = (len: number) => len - window + offset;
        const sample = series.map((s) => s[idx(s.length)]);
        if (relativeSpread(sample) > threshold) {
          return false;
        }
      }
      return true;
    },
  };
}

/**
 * Early bail-out: stop the moment the CURRENT cross-instance relative spread
 * reaches `threshold` (e.g. instances are diverging and there's no point
 * continuing). Needs >=2 instances.
 */
export function divergenceExceeded(options: { threshold: number }): StopConditionDescriptor {
  const { threshold } = options;
  return {
    id: 'divergence-exceeded',
    label: `Divergence ≥${(threshold * 100).toFixed(0)}%`,
    predicate: (ctx) => {
      if (ctx.instances.length < 2) return false;
      const current = ctx.instances.map((s) => s.observable);
      return relativeSpread(current) >= threshold;
    },
  };
}

/** Never stops on its own; the user stops the run manually. */
export function manual(): StopConditionDescriptor {
  return {
    id: 'manual',
    label: 'Manual (run until stopped)',
    predicate: () => false,
  };
}

/**
 * Combine predicates. `'any'` stops when at least one fires (logical OR);
 * `'all'` stops only when every predicate fires (logical AND). An empty list
 * never stops (any => false, all => vacuously... treated as never-stop so a
 * UI with no conditions selected keeps running).
 */
export function combineStop(predicates: StopPredicate[], mode: 'any' | 'all'): StopPredicate {
  return (ctx) => {
    if (predicates.length === 0) return false;
    if (mode === 'any') {
      return predicates.some((p) => p(ctx));
    }
    return predicates.every((p) => p(ctx));
  };
}
