/**
 * DWBC initial-state generators (Fig. 2 / Fig. 3 of arXiv:cond-mat/0502314v1).
 *
 * The vertex-type pattern is taken straight from the paper's matrices; the arrow
 * directions come from the single source of truth, getVertexConfiguration(). The
 * shared edge arrays are then derived from those configurations so that every
 * shared edge is consistent by construction (verified in edgeConsistency.test.ts).
 */

import type { LatticeState, Vertex, VertexConfiguration } from './types';
import { VertexType, EdgeState, getVertexConfiguration } from './types';

const oppositeOf = (e: EdgeState): EdgeState => (e === EdgeState.In ? EdgeState.Out : EdgeState.In);

/** A lattice size must be a non-negative integer. */
function assertValidSize(size: number): void {
  if (!Number.isInteger(size) || size < 0) {
    throw new RangeError(`Invalid lattice size: ${size} (expected a non-negative integer)`);
  }
}

/**
 * Build fully-populated, edge-consistent horizontal/vertical edge arrays from a
 * grid of vertex types, using the lattice edge convention shared with
 * initialStates.ts:
 *   - horizontalEdges has `size` rows of `size + 1` entries; the entry to the
 *     right of vertex (r,c) is stored directly as that vertex's `right` state,
 *     and a vertex reads its `left` as the opposite of the entry on its left.
 *   - verticalEdges has `size + 1` rows of `size` entries; the entry below
 *     vertex (r,c) is stored directly as that vertex's `bottom` state, and a
 *     vertex reads its `top` as the opposite of the entry above it.
 * Because neighbouring configurations agree on every shared edge, the directly
 * stored value and the "opposite of the neighbour" value coincide.
 */
function buildEdges(vertexTypes: VertexType[][], size: number) {
  const horizontalEdges: EdgeState[][] = Array.from(
    { length: size },
    () => new Array<EdgeState>(size + 1),
  );
  const verticalEdges: EdgeState[][] = Array.from(
    { length: size + 1 },
    () => new Array<EdgeState>(size),
  );

  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      const cfg = getVertexConfiguration(vertexTypes[row][col]);
      horizontalEdges[row][col + 1] = cfg.right;
      verticalEdges[row + 1][col] = cfg.bottom;
      if (col === 0) horizontalEdges[row][0] = oppositeOf(cfg.left);
      if (row === 0) verticalEdges[0][col] = oppositeOf(cfg.top);
    }
  }

  return { horizontalEdges, verticalEdges };
}

function buildVertices(vertexTypes: VertexType[][], size: number): Vertex[][] {
  const vertices: Vertex[][] = [];
  for (let row = 0; row < size; row++) {
    vertices[row] = [];
    for (let col = 0; col < size; col++) {
      const type = vertexTypes[row][col];
      const configuration: VertexConfiguration = getVertexConfiguration(type);
      vertices[row][col] = { position: { row, col }, type, configuration };
    }
  }
  return vertices;
}

/**
 * DWBC High (Fig. 2): c2 on the anti-diagonal, b1 upper-left, b2 lower-right.
 */
export function generateDWBCHighCorrectIce(size: number): LatticeState {
  assertValidSize(size);
  const vertexTypes: VertexType[][] = [];
  for (let row = 0; row < size; row++) {
    vertexTypes[row] = [];
    for (let col = 0; col < size; col++) {
      if (row + col === size - 1) {
        vertexTypes[row][col] = VertexType.c2; // anti-diagonal
      } else if (row + col < size - 1) {
        vertexTypes[row][col] = VertexType.b1; // upper-left
      } else {
        vertexTypes[row][col] = VertexType.b2; // lower-right
      }
    }
  }

  const { horizontalEdges, verticalEdges } = buildEdges(vertexTypes, size);
  return {
    width: size,
    height: size,
    vertices: buildVertices(vertexTypes, size),
    horizontalEdges,
    verticalEdges,
  };
}

/**
 * DWBC Low (Fig. 3): c2 on the main diagonal, a1 upper-right, a2 lower-left.
 */
export function generateDWBCLowCorrectIce(size: number): LatticeState {
  assertValidSize(size);
  const vertexTypes: VertexType[][] = [];
  for (let row = 0; row < size; row++) {
    vertexTypes[row] = [];
    for (let col = 0; col < size; col++) {
      if (row === col) {
        vertexTypes[row][col] = VertexType.c2; // main diagonal
      } else if (row < col) {
        vertexTypes[row][col] = VertexType.a1; // upper-right
      } else {
        vertexTypes[row][col] = VertexType.a2; // lower-left
      }
    }
  }

  const { horizontalEdges, verticalEdges } = buildEdges(vertexTypes, size);
  return {
    width: size,
    height: size,
    vertices: buildVertices(vertexTypes, size),
    horizontalEdges,
    verticalEdges,
  };
}
