/**
 * Per-cell difference between two N-sim lattices (issue #60).
 *
 * Reduces each simulation to a row-major grid of vertex-type ids (0..5) — read
 * from the compact raw snapshot when available, else from the object state — and
 * compares two same-size grids cell by cell. Pure, engine-agnostic, and used by
 * the N-sim diff/overlay view.
 */

import type { SimulationController, VertexType } from './types';
import { VertexType as VT } from './types';

export interface TypeGrid {
  width: number;
  height: number;
  /** Row-major vertex-type ids, index = row * width + col. */
  ids: Int8Array;
}

export interface GridDiff {
  width: number;
  height: number;
  /** Row-major flag: 1 where the two grids' vertex types differ, else 0. */
  diff: Uint8Array;
  /** Number of cells that differ. */
  differing: number;
  /** Total cells compared. */
  total: number;
  /** Fraction of cells that differ in [0, 1]. */
  fraction: number;
}

// Object-state vertex type -> numeric id (matches the engine's Int8Array coding).
const TYPE_TO_NUM: Record<VertexType, number> = {
  [VT.a1]: 0,
  [VT.a2]: 1,
  [VT.b1]: 2,
  [VT.b2]: 3,
  [VT.c1]: 4,
  [VT.c2]: 5,
};

/**
 * Reduce a controller's current state to a TypeGrid, or null if no state is
 * available yet (e.g. a worker that hasn't produced its first snapshot).
 */
export function extractTypeGrid(controller: SimulationController): TypeGrid | null {
  const raw = controller.getRawState();
  if (raw) {
    return { width: raw.width, height: raw.height, ids: raw.vertices };
  }
  try {
    const state = controller.getState();
    if (!state || !state.vertices?.length) return null;
    const { width, height } = state;
    const ids = new Int8Array(width * height);
    for (let row = 0; row < height; row++) {
      for (let col = 0; col < width; col++) {
        ids[row * width + col] = TYPE_TO_NUM[state.vertices[row][col].type];
      }
    }
    return { width, height, ids };
  } catch {
    return null;
  }
}

/**
 * Per-cell diff of two same-size grids. Returns null if either is missing or the
 * dimensions don't match (the diff/overlay only applies to same-size lattices).
 */
export function diffTypeGrids(a: TypeGrid | null, b: TypeGrid | null): GridDiff | null {
  if (!a || !b) return null;
  if (a.width !== b.width || a.height !== b.height) return null;

  const total = a.width * a.height;
  const diff = new Uint8Array(total);
  let differing = 0;
  for (let i = 0; i < total; i++) {
    if (a.ids[i] !== b.ids[i]) {
      diff[i] = 1;
      differing++;
    }
  }
  return {
    width: a.width,
    height: a.height,
    diff,
    differing,
    total,
    fraction: total === 0 ? 0 : differing / total,
  };
}
