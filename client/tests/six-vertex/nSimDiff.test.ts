/**
 * Tests for the N-sim per-cell diff helper (issue #60).
 */

import { describe, it, expect } from '@jest/globals';
import { diffTypeGrids, extractTypeGrid, type TypeGrid } from '../../src/lib/six-vertex/nSimDiff';
import type { SimulationController, LatticeState } from '../../src/lib/six-vertex/types';
import { VertexType, getVertexConfiguration } from '../../src/lib/six-vertex/types';

const grid = (width: number, height: number, ids: number[]): TypeGrid => ({
  width,
  height,
  ids: Int8Array.from(ids),
});

describe('diffTypeGrids', () => {
  it('reports zero differences for identical grids', () => {
    const a = grid(2, 2, [0, 1, 2, 3]);
    const d = diffTypeGrids(a, grid(2, 2, [0, 1, 2, 3]))!;
    expect(d.differing).toBe(0);
    expect(d.fraction).toBe(0);
    expect(Array.from(d.diff)).toEqual([0, 0, 0, 0]);
  });

  it('flags every differing cell and counts them', () => {
    const d = diffTypeGrids(grid(2, 2, [0, 1, 2, 3]), grid(2, 2, [0, 9, 2, 9]))!;
    expect(Array.from(d.diff)).toEqual([0, 1, 0, 1]);
    expect(d.differing).toBe(2);
    expect(d.total).toBe(4);
    expect(d.fraction).toBe(0.5);
  });

  it('reports all cells differing when grids fully disagree', () => {
    const d = diffTypeGrids(grid(2, 1, [0, 0]), grid(2, 1, [1, 1]))!;
    expect(d.differing).toBe(2);
    expect(d.fraction).toBe(1);
  });

  it('returns null for mismatched dimensions', () => {
    expect(diffTypeGrids(grid(2, 2, [0, 0, 0, 0]), grid(3, 2, [0, 0, 0, 0, 0, 0]))).toBeNull();
    expect(diffTypeGrids(grid(2, 2, [0, 0, 0, 0]), grid(2, 3, [0, 0, 0, 0, 0, 0]))).toBeNull();
  });

  it('returns null when either grid is missing', () => {
    expect(diffTypeGrids(null, grid(1, 1, [0]))).toBeNull();
    expect(diffTypeGrids(grid(1, 1, [0]), null)).toBeNull();
  });
});

describe('extractTypeGrid', () => {
  it('uses the compact raw snapshot when available', () => {
    const raw = { width: 2, height: 2, vertices: Int8Array.from([5, 4, 3, 2]) };
    const ctrl = {
      getRawState: () => raw,
      getState: () => {
        throw new Error('should not be called');
      },
    } as unknown as SimulationController;
    const g = extractTypeGrid(ctrl)!;
    expect(g.width).toBe(2);
    expect(Array.from(g.ids)).toEqual([5, 4, 3, 2]);
  });

  it('falls back to the object state and maps types to ids', () => {
    const mk = (t: VertexType, row: number, col: number) => ({
      position: { row, col },
      type: t,
      configuration: getVertexConfiguration(t),
    });
    const state: LatticeState = {
      width: 2,
      height: 1,
      vertices: [[mk(VertexType.a1, 0, 0), mk(VertexType.c2, 0, 1)]],
      horizontalEdges: [],
      verticalEdges: [],
    };
    const ctrl = {
      getRawState: () => null,
      getState: () => state,
    } as unknown as SimulationController;
    const g = extractTypeGrid(ctrl)!;
    expect(Array.from(g.ids)).toEqual([0, 5]); // a1 -> 0, c2 -> 5
  });

  it('returns null when no state is available', () => {
    const ctrl = {
      getRawState: () => null,
      getState: () => {
        throw new Error('no state yet');
      },
    } as unknown as SimulationController;
    expect(extractTypeGrid(ctrl)).toBeNull();
  });

  it('diff of two extracted grids is consistent end to end', () => {
    const ctrlA = {
      getRawState: () => ({ width: 2, height: 2, vertices: Int8Array.from([0, 1, 2, 3]) }),
    } as unknown as SimulationController;
    const ctrlB = {
      getRawState: () => ({ width: 2, height: 2, vertices: Int8Array.from([0, 1, 2, 9]) }),
    } as unknown as SimulationController;
    const d = diffTypeGrids(extractTypeGrid(ctrlA), extractTypeGrid(ctrlB))!;
    expect(d.differing).toBe(1);
  });
});
