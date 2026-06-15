/**
 * Generators for initial lattice states
 * Focuses on Domain Wall Boundary Conditions (DWBC)
 * Based on Figures 2 and 3 from David Allison & Reshetikhin (2005) paper: arXiv:cond-mat/0502314v1
 */

import { generateDWBCHighCorrectIce, generateDWBCLowCorrectIce } from './dwbcCorrectIce';
import type { LatticeState, Vertex, DWBCConfig, VertexConfiguration } from './types';
import { VertexType, EdgeState, getVertexType, getVertexConfiguration } from './types';

/**
 * Generate DWBC High state (Figure 2 from the paper)
 * Pattern: c2 vertices on anti-diagonal, b1 in upper-left, b2 in lower-right
 *
 * From the paper Figure 2:
 * ```
 * b1 b1 b1 b1 b1 c2
 * b1 b1 b1 b1 c2 b2
 * b1 b1 b1 c2 b2 b2
 * b1 b1 c2 b2 b2 b2
 * b1 c2 b2 b2 b2 b2
 * c2 b2 b2 b2 b2 b2
 * ```
 */
export function generateDWBCHigh(size: number): LatticeState {
  // Use the correct ice version that ensures ice rule compliance
  return generateDWBCHighCorrectIce(size);
}

/**
 * Generate DWBC Low state (Figure 3 from the paper)
 * Pattern: c2 vertices on main diagonal, a1 in upper-right, a2 in lower-left
 *
 * From the paper Figure 3:
 * ```
 * c2 a1 a1 a1 a1 a1
 * a2 c2 a1 a1 a1 a1
 * a2 a2 c2 a1 a1 a1
 * a2 a2 a2 c2 a1 a1
 * a2 a2 a2 a2 c2 a1
 * a2 a2 a2 a2 a2 c2
 * ```
 */
export function generateDWBCLow(size: number): LatticeState {
  // Use the correct ice version that ensures ice rule compliance
  return generateDWBCLowCorrectIce(size);
}

/**
 * Generate a lattice with Domain Wall Boundary Conditions
 * Delegates to specific High or Low generators based on config
 */
export function generateDWBCState(width: number, height: number, config: DWBCConfig): LatticeState {
  // For DWBC, width and height should be equal
  const size = Math.min(width, height);

  if (config.type === 'high') {
    return generateDWBCHigh(size);
  } else {
    return generateDWBCLow(size);
  }
}

/**
 * Generate a general DWBC state with random or custom pattern
 * (Original implementation for backward compatibility)
 */

/**
 * Generate a random valid ice configuration
 */
export function generateRandomIceState(width: number, height: number, seed?: number): LatticeState {
  // Use a simple seeded random if provided
  const random = seed ? createSeededRandom(seed) : Math.random;

  const horizontalEdges: EdgeState[][] = [];
  const verticalEdges: EdgeState[][] = [];

  // Initialize arrays
  for (let row = 0; row <= height; row++) {
    horizontalEdges[row] = new Array(width + 1);
    verticalEdges[row] = new Array(width + 1);
  }

  // Use a path-based generation to ensure ice rule is satisfied
  // Start from top-left and build valid configurations row by row
  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      // Count existing ins and outs
      let ins = 0;
      let outs = 0;

      // Check left edge
      if (col === 0) {
        horizontalEdges[row][0] = random() > 0.5 ? EdgeState.In : EdgeState.Out;
      }
      if (horizontalEdges[row][col] === EdgeState.Out) ins++;
      else outs++;

      // Check top edge
      if (row === 0) {
        verticalEdges[0][col] = random() > 0.5 ? EdgeState.In : EdgeState.Out;
      }
      if (verticalEdges[row][col] === EdgeState.Out) ins++;
      else outs++;

      // Now set right and bottom edges to satisfy ice rule (2 in, 2 out)
      const needIns = 2 - ins;
      const needOuts = 2 - outs;

      if (needIns === 2) {
        horizontalEdges[row][col + 1] = EdgeState.In;
        verticalEdges[row + 1][col] = EdgeState.In;
      } else if (needOuts === 2) {
        horizontalEdges[row][col + 1] = EdgeState.Out;
        verticalEdges[row + 1][col] = EdgeState.Out;
      } else {
        // Need one of each
        if (random() > 0.5) {
          horizontalEdges[row][col + 1] = EdgeState.In;
          verticalEdges[row + 1][col] = EdgeState.Out;
        } else {
          horizontalEdges[row][col + 1] = EdgeState.Out;
          verticalEdges[row + 1][col] = EdgeState.In;
        }
      }
    }
  }

  // Create vertices from edges
  const vertices: Vertex[][] = [];

  for (let row = 0; row < height; row++) {
    vertices[row] = [];
    for (let col = 0; col < width; col++) {
      const configuration: VertexConfiguration = {
        left: horizontalEdges[row][col] === EdgeState.Out ? EdgeState.In : EdgeState.Out,
        right: horizontalEdges[row][col + 1],
        top: verticalEdges[row][col] === EdgeState.In ? EdgeState.Out : EdgeState.In,
        bottom: verticalEdges[row + 1][col],
      };

      const type = getVertexType(configuration);

      vertices[row][col] = {
        position: { row, col },
        type: type || VertexType.a1,
        configuration,
      };
    }
  }

  return {
    width,
    height,
    vertices,
    horizontalEdges,
    verticalEdges,
  };
}

/**
 * Generate a uniform state with all vertices of the same type
 */
export function generateUniformState(
  width: number,
  height: number,
  vertexType: VertexType,
): LatticeState {
  const horizontalEdges: EdgeState[][] = [];
  const verticalEdges: EdgeState[][] = [];
  const vertices: Vertex[][] = [];

  // Initialize based on vertex type pattern
  // This is simplified - in practice, not all vertex types can tile uniformly
  for (let row = 0; row <= height; row++) {
    horizontalEdges[row] = new Array(width + 1);
    verticalEdges[row] = new Array(width + 1);
    if (row < height) vertices[row] = [];
  }

  // Set up a checkerboard pattern that allows uniform vertex types
  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      // For simplicity, create alternating pattern
      const checker = (row + col) % 2 === 0;

      if (vertexType === VertexType.a1 || vertexType === VertexType.a2) {
        // Alternating pattern for a-type vertices
        horizontalEdges[row][col] = checker ? EdgeState.Out : EdgeState.In;
        horizontalEdges[row][col + 1] = checker ? EdgeState.In : EdgeState.Out;
        verticalEdges[row][col] = checker ? EdgeState.Out : EdgeState.In;
        verticalEdges[row + 1][col] = checker ? EdgeState.In : EdgeState.Out;
      } else {
        // For other types, use appropriate patterns
        horizontalEdges[row][col] = EdgeState.Out;
        horizontalEdges[row][col + 1] = EdgeState.In;
        verticalEdges[row][col] = EdgeState.Out;
        verticalEdges[row + 1][col] = EdgeState.In;
      }

      // Use the canonical 2-in/2-out configuration for the requested type so the
      // ice rule holds at every vertex. (A single vertex type cannot always tile
      // the whole lattice, but each vertex's configuration is always valid.)
      const configuration = getVertexConfiguration(vertexType);

      vertices[row][col] = {
        position: { row, col },
        type: vertexType,
        configuration,
      };
    }
  }

  return {
    width,
    height,
    vertices,
    horizontalEdges,
    verticalEdges,
  };
}

/**
 * Simple seeded random number generator
 */
function createSeededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

/**
 * Validate that a lattice state satisfies the ice rule
 */
export function validateIceRule(state: LatticeState): boolean {
  for (let row = 0; row < state.height; row++) {
    for (let col = 0; col < state.width; col++) {
      const vertex = state.vertices[row][col];
      const { configuration } = vertex;

      // Count ins and outs
      const edges = [
        configuration.left,
        configuration.right,
        configuration.top,
        configuration.bottom,
      ];

      const ins = edges.filter((e) => e === EdgeState.In).length;
      const outs = edges.filter((e) => e === EdgeState.Out).length;

      if (ins !== 2 || outs !== 2) {
        // Silent validation - no console logging
        return false;
      }
    }
  }

  return true;
}
