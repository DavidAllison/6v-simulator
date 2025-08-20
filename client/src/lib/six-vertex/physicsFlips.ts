/**
 * Physics-accurate flip implementation for the 6-vertex model
 * Based on the C reference implementation from main.c
 * Implements 2x2 neighborhood flips as described in the paper
 */

import type { LatticeState, Position } from './types';
import { VertexType, EdgeState, getVertexType, getVertexConfiguration } from './types';

/**
 * Flip direction types from main.c
 * HIGH = 1 (flip up), LOW = 0 (flip down)
 */
export const FlipDirection = {
  Down: 'down', // LOW = 0 in main.c
  Up: 'up', // HIGH = 1 in main.c
} as const;

export type FlipDirection = (typeof FlipDirection)[keyof typeof FlipDirection];

/**
 * Result of checking if a position can flip
 */
export interface FlipCapability {
  canFlipUp: boolean;
  canFlipDown: boolean;
}

/**
 * Check if a position can be flipped (port of getisflippable from main.c)
 *
 * From main.c logic:
 * - For up flip: vertex must be a1 (type 0) or c2 (type 5)
 *   and upper-right neighbor must be a2 (type 1) or c2 (type 5)
 * - For down flip: vertex must be c1 (type 4) or a1 (type 0)
 *   and lower-left neighbor must be a2 (type 1) or c1 (type 4)
 */
export function isFlippable(state: LatticeState, row: number, col: number): FlipCapability {
  const result: FlipCapability = {
    canFlipUp: false,
    canFlipDown: false,
  };

  // Bounds checking
  if (row < 0 || row >= state.height || col < 0 || col >= state.width) {
    return result;
  }

  const vertex = state.vertices[row][col];

  // Check for up flip capability
  if (row > 0 && col < state.width - 1) {
    // Vertex must be a1 or c2
    if (vertex.type === VertexType.a1 || vertex.type === VertexType.c2) {
      // Check upper-right neighbor
      const upperRight = state.vertices[row - 1][col + 1];
      if (upperRight.type === VertexType.a2 || upperRight.type === VertexType.c2) {
        result.canFlipUp = true;
      }
    }
  }

  // Check for down flip capability
  if (row < state.height - 1 && col > 0) {
    // Vertex must be c1 or a1
    if (vertex.type === VertexType.c1 || vertex.type === VertexType.a1) {
      // Check lower-left neighbor
      const lowerLeft = state.vertices[row + 1][col - 1];
      if (lowerLeft.type === VertexType.a2 || lowerLeft.type === VertexType.c1) {
        result.canFlipDown = true;
      }
    }
  }

  return result;
}

/**
 * Execute a flip at the given position (port of executeflip from main.c)
 * Updates a 2x2 neighborhood of vertices
 */
export function executeFlip(
  state: LatticeState,
  row: number,
  col: number,
  direction: FlipDirection,
): LatticeState {
  // Create a deep copy of the state
  const newState: LatticeState = {
    width: state.width,
    height: state.height,
    vertices: state.vertices.map((row) =>
      row.map((v) => ({ ...v, configuration: { ...v.configuration } })),
    ),
    horizontalEdges: state.horizontalEdges.map((row) => [...row]),
    verticalEdges: state.verticalEdges.map((row) => [...row]),
  };

  if (direction === FlipDirection.Up) {
    executeUpFlip(newState, row, col);
  } else {
    executeDownFlip(newState, row, col);
  }

  return newState;
}

/**
 * Execute an up flip (port of updatepositions with type=HIGH from main.c)
 * Updates a 2x2 region: base, right, up-right, up
 */
function executeUpFlip(state: LatticeState, row: number, col: number): void {
  // Get the four vertices in the 2x2 neighborhood
  const base = state.vertices[row][col]; // Position One in main.c
  const right = state.vertices[row][col + 1]; // Position Two in main.c
  const upRight = state.vertices[row - 1][col + 1]; // Position Three in main.c
  const up = state.vertices[row - 1][col]; // Position Four in main.c

  // Update vertex types according to main.c logic
  // Base: a1 -> c1, c2 -> a2
  if (base.type === VertexType.a1) {
    base.type = VertexType.c1;
  } else if (base.type === VertexType.c2) {
    base.type = VertexType.a2;
  }

  // Right: b2 -> c2, c1 -> b1
  if (right && col + 1 < state.width) {
    if (right.type === VertexType.b2) {
      right.type = VertexType.c2;
    } else if (right.type === VertexType.c1) {
      right.type = VertexType.b1;
    }
  }

  // Up-Right: a2 -> c1, c2 -> a1
  if (upRight && row > 0 && col + 1 < state.width) {
    if (upRight.type === VertexType.a2) {
      upRight.type = VertexType.c1;
    } else if (upRight.type === VertexType.c2) {
      upRight.type = VertexType.a1;
    }
  }

  // Up: b1 -> c2, c1 -> b2
  if (up && row > 0) {
    if (up.type === VertexType.b1) {
      up.type = VertexType.c2;
    } else if (up.type === VertexType.c1) {
      up.type = VertexType.b2;
    }
  }

  // Update configurations for all affected vertices
  updateVertexConfiguration(state, row, col);
  if (col + 1 < state.width) updateVertexConfiguration(state, row, col + 1);
  if (row > 0 && col + 1 < state.width) updateVertexConfiguration(state, row - 1, col + 1);
  if (row > 0) updateVertexConfiguration(state, row - 1, col);
}

/**
 * Execute a down flip (port of updatepositions with type=LOW from main.c)
 * Updates a 2x2 region: base, left, down-left, down
 */
function executeDownFlip(state: LatticeState, row: number, col: number): void {
  // Get the four vertices in the 2x2 neighborhood
  const base = state.vertices[row][col]; // Position Three in main.c (for down flip)
  const left = state.vertices[row][col - 1]; // Position Four in main.c
  const downLeft = state.vertices[row + 1][col - 1]; // Position One in main.c
  const down = state.vertices[row + 1][col]; // Position Two in main.c

  // Update vertex types according to main.c logic
  // Base: c1 -> a2, a1 -> c2
  if (base.type === VertexType.c1) {
    base.type = VertexType.a2;
  } else if (base.type === VertexType.a1) {
    base.type = VertexType.c2;
  }

  // Left: b1 -> c1, c2 -> b2
  if (left && col > 0) {
    if (left.type === VertexType.b1) {
      left.type = VertexType.c1;
    } else if (left.type === VertexType.c2) {
      left.type = VertexType.b2;
    }
  }

  // Down-Left: c2 -> a1, a2 -> c1
  if (downLeft && row + 1 < state.height && col > 0) {
    if (downLeft.type === VertexType.c2) {
      downLeft.type = VertexType.a1;
    } else if (downLeft.type === VertexType.a2) {
      downLeft.type = VertexType.c1;
    }
  }

  // Down: c1 -> b1, b2 -> c2
  if (down && row + 1 < state.height) {
    if (down.type === VertexType.c1) {
      down.type = VertexType.b1;
    } else if (down.type === VertexType.b2) {
      down.type = VertexType.c2;
    }
  }

  // Update configurations for all affected vertices
  updateVertexConfiguration(state, row, col);
  if (col > 0) updateVertexConfiguration(state, row, col - 1);
  if (row + 1 < state.height && col > 0) updateVertexConfiguration(state, row + 1, col - 1);
  if (row + 1 < state.height) updateVertexConfiguration(state, row + 1, col);
}

/**
 * Update vertex configuration and edges based on its type
 */
function updateVertexConfiguration(state: LatticeState, row: number, col: number): void {
  const vertex = state.vertices[row][col];
  const newConfig = getVertexConfiguration(vertex.type);
  vertex.configuration = newConfig;

  // Update edges to match the new configuration
  // Right edge
  if (col < state.width - 1) {
    state.horizontalEdges[row][col + 1] = newConfig.right;
  }

  // Bottom edge
  if (row < state.height - 1) {
    state.verticalEdges[row + 1][col] = newConfig.bottom;
  }

  // Left edge (derived from left neighbor's right edge)
  if (col > 0) {
    const leftConfig = state.vertices[row][col - 1].configuration;
    vertex.configuration.left = leftConfig.right === EdgeState.In ? EdgeState.Out : EdgeState.In;
  }

  // Top edge (derived from top neighbor's bottom edge)
  if (row > 0) {
    const topConfig = state.vertices[row - 1][col].configuration;
    vertex.configuration.top = topConfig.bottom === EdgeState.In ? EdgeState.Out : EdgeState.In;
  }
}

/**
 * Calculate the weight ratio for a flip (port of getweightratio from main.c)
 * Returns the probability of accepting the flip
 */
export function getWeightRatio(
  state: LatticeState,
  row: number,
  col: number,
  direction: FlipDirection,
  weights: Record<VertexType, number>,
): number {
  // Get the 2x2 neighborhood vertices
  let v1: VertexType, v2: VertexType, v3: VertexType, v4: VertexType;

  if (direction === FlipDirection.Up) {
    v1 = state.vertices[row][col].type; // base
    v2 =
      row < state.height && col + 1 < state.width
        ? state.vertices[row][col + 1].type
        : VertexType.a1; // right
    v3 = row > 0 && col + 1 < state.width ? state.vertices[row - 1][col + 1].type : VertexType.a1; // up-right
    v4 = row > 0 ? state.vertices[row - 1][col].type : VertexType.a1; // up
  } else {
    v1 = row + 1 < state.height && col > 0 ? state.vertices[row + 1][col - 1].type : VertexType.a1; // down-left
    v2 = row + 1 < state.height ? state.vertices[row + 1][col].type : VertexType.a1; // down
    v3 = state.vertices[row][col].type; // base
    v4 = col > 0 ? state.vertices[row][col - 1].type : VertexType.a1; // left
  }

  // Calculate weight before flip
  const weightBefore = weights[v1] * weights[v2] * weights[v3] * weights[v4];

  // Determine new vertex types after flip
  let new1: VertexType, new2: VertexType, new3: VertexType, new4: VertexType;

  if (direction === FlipDirection.Up) {
    // Apply up flip transformations
    new1 = v1 === VertexType.a1 ? VertexType.c1 : v1 === VertexType.c2 ? VertexType.a2 : v1;
    new2 = v2 === VertexType.b2 ? VertexType.c2 : v2 === VertexType.c1 ? VertexType.b1 : v2;
    new3 = v3 === VertexType.a2 ? VertexType.c1 : v3 === VertexType.c2 ? VertexType.a1 : v3;
    new4 = v4 === VertexType.b1 ? VertexType.c2 : v4 === VertexType.c1 ? VertexType.b2 : v4;
  } else {
    // Apply down flip transformations
    new1 = v1 === VertexType.c2 ? VertexType.a1 : v1 === VertexType.a2 ? VertexType.c1 : v1;
    new2 = v2 === VertexType.c1 ? VertexType.b1 : v2 === VertexType.b2 ? VertexType.c2 : v2;
    new3 = v3 === VertexType.c1 ? VertexType.a2 : v3 === VertexType.a1 ? VertexType.c2 : v3;
    new4 = v4 === VertexType.b1 ? VertexType.c1 : v4 === VertexType.c2 ? VertexType.b2 : v4;
  }

  // Calculate weight after flip
  const weightAfter = weights[new1] * weights[new2] * weights[new3] * weights[new4];

  // Return the ratio (used for Metropolis acceptance)
  return weightAfter / weightBefore;
}

/**
 * Get all flippable positions in the lattice
 */
export function getAllFlippablePositions(state: LatticeState): Array<{
  position: Position;
  capability: FlipCapability;
}> {
  const flippable: Array<{ position: Position; capability: FlipCapability }> = [];

  for (let row = 0; row < state.height; row++) {
    for (let col = 0; col < state.width; col++) {
      const capability = isFlippable(state, row, col);
      if (capability.canFlipUp || capability.canFlipDown) {
        flippable.push({
          position: { row, col },
          capability,
        });
      }
    }
  }

  return flippable;
}

/**
 * Calculate the height (volume) of the lattice
 * Height increases when flipping down, decreases when flipping up
 */
export function calculateHeight(state: LatticeState): number {
  let height = 0;

  // Count vertices that contribute to height
  // Based on main.c, certain vertex types contribute to the height function
  for (let row = 0; row < state.height; row++) {
    for (let col = 0; col < state.width; col++) {
      const vertex = state.vertices[row][col];
      // In the height function, a1, b1, and c2 vertices contribute
      if (
        vertex.type === VertexType.a1 ||
        vertex.type === VertexType.b1 ||
        vertex.type === VertexType.c2
      ) {
        height++;
      }
    }
  }

  return height;
}
