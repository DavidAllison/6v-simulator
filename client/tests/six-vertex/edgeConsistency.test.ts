/**
 * Edge-consistency & arrow-convention tests for the 6-vertex model.
 *
 * These lock in the canonical arrow table (Fig. 1 of arXiv:cond-mat/0502314v1)
 * via three independent checks that together pin it uniquely:
 *   1. getVertexConfiguration matches the verified table and getVertexType is its
 *      exact inverse;
 *   2. the DWBC High/Low grids (both the object generators and the optimized
 *      engine's id grids) are edge-consistent and have the correct fixed
 *      boundary; and
 *   3. the thick-edge set implied by the arrows (arrow points down or right)
 *      matches the bold path segments (getPathSegments / main.c draw_vertex).
 */

import { describe, it, expect } from '@jest/globals';
import type { LatticeState, Vertex } from '../../src/lib/six-vertex/types';
import {
  VertexType,
  EdgeState,
  EdgeDirection,
  getVertexConfiguration,
  getVertexType,
} from '../../src/lib/six-vertex/types';
import {
  generateDWBCHigh,
  generateDWBCLow,
  validateIceRule,
  validateEdgeConsistency,
  findEdgeInconsistencies,
} from '../../src/lib/six-vertex/initialStates';
import {
  generateDWBCHighOptimized,
  generateDWBCLowOptimized,
} from '../../src/lib/six-vertex/optimizedSimulation';
import { getPathSegments } from '../../src/lib/six-vertex/vertexShapes';

const { In, Out } = EdgeState;

// The canonical table (left, right, top, bottom), verified three independent ways.
const CANONICAL: Record<VertexType, [EdgeState, EdgeState, EdgeState, EdgeState]> = {
  [VertexType.a1]: [In, Out, In, Out],
  [VertexType.a2]: [Out, In, Out, In],
  [VertexType.b1]: [Out, In, In, Out],
  [VertexType.b2]: [In, Out, Out, In],
  [VertexType.c1]: [In, In, Out, Out],
  [VertexType.c2]: [Out, Out, In, In],
};

const ALL_TYPES = Object.values(VertexType);
const NUM_TO_TYPE = [
  VertexType.a1,
  VertexType.a2,
  VertexType.b1,
  VertexType.b2,
  VertexType.c1,
  VertexType.c2,
];

function rawToState(raw: Int8Array | Uint8Array, size: number): LatticeState {
  const vertices: Vertex[][] = [];
  for (let row = 0; row < size; row++) {
    vertices[row] = [];
    for (let col = 0; col < size; col++) {
      const type = NUM_TO_TYPE[raw[row * size + col]];
      vertices[row][col] = {
        position: { row, col },
        type,
        configuration: getVertexConfiguration(type),
      };
    }
  }
  return { width: size, height: size, vertices, horizontalEdges: [], verticalEdges: [] };
}

describe('Canonical arrow table', () => {
  it('getVertexConfiguration matches the verified table', () => {
    for (const type of ALL_TYPES) {
      const cfg = getVertexConfiguration(type);
      const [left, right, top, bottom] = CANONICAL[type];
      expect({ ...cfg }).toEqual({ left, right, top, bottom });
    }
  });

  it('every type is a valid 2-in / 2-out ice configuration', () => {
    for (const type of ALL_TYPES) {
      const cfg = getVertexConfiguration(type);
      const ins = [cfg.left, cfg.right, cfg.top, cfg.bottom].filter((e) => e === In).length;
      expect(ins).toBe(2);
    }
  });

  it('getVertexType is the exact inverse of getVertexConfiguration', () => {
    for (const type of ALL_TYPES) {
      expect(getVertexType(getVertexConfiguration(type))).toBe(type);
    }
  });

  it('a1 and a2 are unchanged (already correct before the fix)', () => {
    expect({ ...getVertexConfiguration(VertexType.a1) }).toEqual({
      left: In,
      right: Out,
      top: In,
      bottom: Out,
    });
    expect({ ...getVertexConfiguration(VertexType.a2) }).toEqual({
      left: Out,
      right: In,
      top: Out,
      bottom: In,
    });
  });
});

describe('Arrows agree with the bold path picture (main.c draw_vertex)', () => {
  // An edge is thick iff its arrow points down or right:
  //   left In, right Out, top In, bottom Out.
  function thickFromArrows(type: VertexType): Set<EdgeDirection> {
    const c = getVertexConfiguration(type);
    const s = new Set<EdgeDirection>();
    if (c.left === In) s.add(EdgeDirection.Left);
    if (c.right === Out) s.add(EdgeDirection.Right);
    if (c.top === In) s.add(EdgeDirection.Top);
    if (c.bottom === Out) s.add(EdgeDirection.Bottom);
    return s;
  }
  function thickFromPaths(type: VertexType): Set<EdgeDirection> {
    const s = new Set<EdgeDirection>();
    for (const seg of getPathSegments(type)) {
      s.add(seg.from);
      s.add(seg.to);
    }
    return s;
  }

  it('thick-edge set from arrows equals bold path segments for every type', () => {
    for (const type of ALL_TYPES) {
      expect([...thickFromArrows(type)].sort()).toEqual([...thickFromPaths(type)].sort());
    }
  });
});

describe('DWBC grids are edge-consistent (object generators)', () => {
  const sizes = [4, 6, 8, 24];

  for (const size of sizes) {
    it(`DWBC High (N=${size}) is ice-valid and edge-consistent`, () => {
      const state = generateDWBCHigh(size);
      expect(validateIceRule(state)).toBe(true);
      expect(findEdgeInconsistencies(state)).toHaveLength(0);
      expect(validateEdgeConsistency(state)).toBe(true);
    });

    it(`DWBC Low (N=${size}) is ice-valid and edge-consistent`, () => {
      const state = generateDWBCLow(size);
      expect(validateIceRule(state)).toBe(true);
      expect(findEdgeInconsistencies(state)).toHaveLength(0);
      expect(validateEdgeConsistency(state)).toBe(true);
    });
  }

  it('High and Low share the same fixed boundary: in top/bottom, out left/right', () => {
    for (const state of [generateDWBCHigh(8), generateDWBCLow(8)]) {
      const n = state.width;
      for (let col = 0; col < n; col++) {
        expect(state.vertices[0][col].configuration.top).toBe(In);
        expect(state.vertices[n - 1][col].configuration.bottom).toBe(In);
      }
      for (let row = 0; row < n; row++) {
        expect(state.vertices[row][0].configuration.left).toBe(Out);
        expect(state.vertices[row][n - 1].configuration.right).toBe(Out);
      }
    }
  });
});

describe('DWBC grids are edge-consistent (optimized engine id grids)', () => {
  const sizes = [4, 6, 8, 24];
  for (const size of sizes) {
    it(`optimized DWBC High (N=${size}) maps to an edge-consistent state`, () => {
      const state = rawToState(generateDWBCHighOptimized(size), size);
      expect(findEdgeInconsistencies(state)).toHaveLength(0);
    });
    it(`optimized DWBC Low (N=${size}) maps to an edge-consistent state`, () => {
      const state = rawToState(generateDWBCLowOptimized(size), size);
      expect(findEdgeInconsistencies(state)).toHaveLength(0);
    });
  }
});

describe('findEdgeInconsistencies actually detects breakage', () => {
  it('flags a deliberately corrupted vertex', () => {
    const state = generateDWBCHigh(6);
    // Force a mismatch: make an interior vertex disagree with its right neighbour.
    const v = state.vertices[2][2];
    v.configuration = { ...v.configuration, right: v.configuration.right === In ? Out : In };
    expect(findEdgeInconsistencies(state).length).toBeGreaterThan(0);
  });
});
