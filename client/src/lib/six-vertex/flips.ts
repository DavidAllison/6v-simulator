/**
 * Flip detection and execution logic for the 6-vertex model
 * Implements local moves that preserve the ice rule
 */

import type { LatticeState, Position, FlipOperation, VertexConfiguration } from './types';
import { EdgeState, VertexType, getVertexType } from './types';

/**
 * Types of flips that can be performed
 */
export const FlipType = {
  Loop2: 'loop2', // 2-vertex loop flip
  Loop4: 'loop4', // 4-vertex plaquette flip
  Loop6: 'loop6', // 6-vertex hexagon flip
} as const;

export type FlipType = (typeof FlipType)[keyof typeof FlipType];

/**
 * Find all valid flip operations at a given position
 */
export function findValidFlips(state: LatticeState, position: Position): FlipOperation[] {
  const flips: FlipOperation[] = [];

  // Check for 2-vertex flips (adjacent vertices)
  flips.push(...find2VertexFlips(state, position));

  // Check for 4-vertex plaquette flips
  flips.push(...find4VertexFlips(state, position));

  return flips.filter((flip) => flip.isValid);
}

/**
 * Find 2-vertex loop flips from a position
 */
function find2VertexFlips(state: LatticeState, position: Position): FlipOperation[] {
  const flips: FlipOperation[] = [];
  const { row, col } = position;

  // Check horizontal neighbor (to the right)
  if (col < state.width - 1) {
    const flip = check2VertexFlip(state, position, { row, col: col + 1 }, 'horizontal');
    if (flip) flips.push(flip);
  }

  // Check vertical neighbor (below)
  if (row < state.height - 1) {
    const flip = check2VertexFlip(state, position, { row: row + 1, col }, 'vertical');
    if (flip) flips.push(flip);
  }

  return flips;
}

/**
 * Check if a 2-vertex flip is valid
 */
function check2VertexFlip(
  state: LatticeState,
  pos1: Position,
  pos2: Position,
  direction: 'horizontal' | 'vertical',
): FlipOperation | null {
  const vertex1 = state.vertices[pos1.row][pos1.col];
  const vertex2 = state.vertices[pos2.row][pos2.col];

  // For a 2-vertex flip to be valid, the vertices must share two parallel edges
  // that can be flipped while maintaining the ice rule

  if (direction === 'horizontal') {
    // Check if we can flip the top and bottom edges between the vertices
    const topEdgeState = state.horizontalEdges[pos1.row][pos1.col + 1];
    const bottomEdgeState = state.horizontalEdges[pos1.row][pos1.col + 1];

    // The edges must be anti-parallel for a flip to change the configuration
    if (vertex1.type === vertex2.type) {
      return null; // Same vertex types can't flip
    }

    // Check if flipping preserves ice rule
    const newConfig1 = { ...vertex1.configuration };
    const newConfig2 = { ...vertex2.configuration };

    // Flip the shared edge
    newConfig1.right = flipEdgeState(newConfig1.right);
    newConfig2.left = flipEdgeState(newConfig2.left);

    const newType1 = getVertexType(newConfig1);
    const newType2 = getVertexType(newConfig2);

    if (newType1 && newType2) {
      return {
        vertices: [pos1, pos2],
        edgesToFlip: [
          {
            from: pos1,
            to: pos2,
            state: topEdgeState,
          },
        ],
        isValid: true,
      };
    }
  } else {
    // Vertical case
    const sharedEdgeState = state.verticalEdges[pos1.row + 1][pos1.col];

    // Check if flipping preserves ice rule
    const newConfig1 = { ...vertex1.configuration };
    const newConfig2 = { ...vertex2.configuration };

    // Flip the shared edge
    newConfig1.bottom = flipEdgeState(newConfig1.bottom);
    newConfig2.top = flipEdgeState(newConfig2.top);

    const newType1 = getVertexType(newConfig1);
    const newType2 = getVertexType(newConfig2);

    if (newType1 && newType2) {
      return {
        vertices: [pos1, pos2],
        edgesToFlip: [
          {
            from: pos1,
            to: pos2,
            state: sharedEdgeState,
          },
        ],
        isValid: true,
      };
    }
  }

  return null;
}

/**
 * Find 4-vertex plaquette flips from a position
 */
function find4VertexFlips(state: LatticeState, position: Position): FlipOperation[] {
  const flips: FlipOperation[] = [];
  const { row, col } = position;

  // Check if we can form a plaquette with this vertex as top-left
  if (row < state.height - 1 && col < state.width - 1) {
    const flip = check4VertexFlip(state, position);
    if (flip) flips.push(flip);
  }

  return flips;
}

/**
 * Check if a 4-vertex plaquette flip is valid
 */
function check4VertexFlip(state: LatticeState, topLeft: Position): FlipOperation | null {
  const { row, col } = topLeft;

  const positions: Position[] = [
    { row, col }, // Top-left
    { row, col: col + 1 }, // Top-right
    { row: row + 1, col: col + 1 }, // Bottom-right
    { row: row + 1, col }, // Bottom-left
  ];

  // Get all four vertices
  const vertices = positions.map((pos) => state.vertices[pos.row][pos.col]);

  // Check if this forms a flippable loop
  // For a 4-vertex loop, we need alternating edge directions around the plaquette

  const edges = [
    state.horizontalEdges[row][col + 1], // Top edge
    state.verticalEdges[row][col + 1], // Right edge
    state.horizontalEdges[row + 1][col + 1], // Bottom edge
    state.verticalEdges[row][col], // Left edge
  ];

  // Count clockwise and counter-clockwise edges
  let clockwise = 0;
  let counterClockwise = 0;

  // Top edge: In means left-to-right (clockwise)
  if (edges[0] === EdgeState.In) clockwise++;
  else counterClockwise++;

  // Right edge: In means top-to-bottom (clockwise)
  if (edges[1] === EdgeState.In) clockwise++;
  else counterClockwise++;

  // Bottom edge: Out means left-to-right (clockwise)
  if (edges[2] === EdgeState.Out) clockwise++;
  else counterClockwise++;

  // Left edge: Out means top-to-bottom (clockwise)
  if (edges[3] === EdgeState.Out) clockwise++;
  else counterClockwise++;

  // For a valid flip, we need either all clockwise or all counter-clockwise
  if (clockwise !== 4 && counterClockwise !== 4) {
    return null;
  }

  // Create the flip operation
  const edgesToFlip = [
    { from: positions[0], to: positions[1], state: edges[0] },
    { from: positions[1], to: positions[2], state: edges[1] },
    { from: positions[2], to: positions[3], state: edges[2] },
    { from: positions[3], to: positions[0], state: edges[3] },
  ];

  return {
    vertices: positions,
    edgesToFlip,
    isValid: true,
  };
}

/**
 * Execute a flip operation on the lattice
 */
export function executeFlip(state: LatticeState, flip: FlipOperation): LatticeState {
  if (!flip.isValid) {
    throw new Error('Cannot execute invalid flip');
  }

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

  // Flip each edge
  for (const edge of flip.edgesToFlip) {
    flipEdge(newState, edge.from, edge.to);
  }

  // Update vertex types based on new configurations
  for (const pos of flip.vertices) {
    const vertex = newState.vertices[pos.row][pos.col];
    vertex.type = getVertexType(vertex.configuration) || vertex.type;
  }

  return newState;
}

/**
 * Flip a single edge between two positions
 */
function flipEdge(state: LatticeState, from: Position, to: Position): void {
  // Determine if this is a horizontal or vertical edge
  if (from.row === to.row) {
    // Horizontal edge
    const col = Math.min(from.col, to.col);
    const edgeCol = col + 1;
    state.horizontalEdges[from.row][edgeCol] = flipEdgeState(
      state.horizontalEdges[from.row][edgeCol],
    );

    // Update vertex configurations
    if (from.col < to.col) {
      // from is left vertex
      state.vertices[from.row][from.col].configuration.right =
        state.horizontalEdges[from.row][edgeCol];
      state.vertices[to.row][to.col].configuration.left = flipEdgeState(
        state.horizontalEdges[from.row][edgeCol],
      );
    } else {
      // from is right vertex
      state.vertices[to.row][to.col].configuration.right = state.horizontalEdges[from.row][edgeCol];
      state.vertices[from.row][from.col].configuration.left = flipEdgeState(
        state.horizontalEdges[from.row][edgeCol],
      );
    }
  } else {
    // Vertical edge
    const row = Math.min(from.row, to.row);
    const edgeRow = row + 1;
    state.verticalEdges[edgeRow][from.col] = flipEdgeState(state.verticalEdges[edgeRow][from.col]);

    // Update vertex configurations
    if (from.row < to.row) {
      // from is top vertex
      state.vertices[from.row][from.col].configuration.bottom =
        state.verticalEdges[edgeRow][from.col];
      state.vertices[to.row][to.col].configuration.top = flipEdgeState(
        state.verticalEdges[edgeRow][from.col],
      );
    } else {
      // from is bottom vertex
      state.vertices[to.row][to.col].configuration.bottom = state.verticalEdges[edgeRow][from.col];
      state.vertices[from.row][from.col].configuration.top = flipEdgeState(
        state.verticalEdges[edgeRow][from.col],
      );
    }
  }
}

/**
 * Flip an edge state
 */
function flipEdgeState(state: EdgeState): EdgeState {
  return state === EdgeState.In ? EdgeState.Out : EdgeState.In;
}

/**
 * Calculate the energy change for a flip operation
 */
export function calculateFlipEnergyChange(
  state: LatticeState,
  flip: FlipOperation,
  weights: Record<VertexType, number>,
): number {
  let energyBefore = 0;
  let energyAfter = 0;

  // Calculate energy before flip
  for (const pos of flip.vertices) {
    const vertex = state.vertices[pos.row][pos.col];
    energyBefore += -Math.log(weights[vertex.type]);
  }

  // Execute flip temporarily to calculate new energy
  const newState = executeFlip(state, flip);

  // Calculate energy after flip
  for (const pos of flip.vertices) {
    const vertex = newState.vertices[pos.row][pos.col];
    energyAfter += -Math.log(weights[vertex.type]);
  }

  return energyAfter - energyBefore;
}

/**
 * Get all possible flips in the lattice
 */
export function getAllPossibleFlips(state: LatticeState): FlipOperation[] {
  const allFlips: FlipOperation[] = [];
  const seen = new Set<string>();

  for (let row = 0; row < state.height; row++) {
    for (let col = 0; col < state.width; col++) {
      const flips = findValidFlips(state, { row, col });

      for (const flip of flips) {
        // Create a unique key for this flip to avoid duplicates
        const key = flip.vertices
          .map((v) => `${v.row},${v.col}`)
          .sort()
          .join('-');

        if (!seen.has(key)) {
          seen.add(key);
          allFlips.push(flip);
        }
      }
    }
  }

  return allFlips;
}
