/**
 * Generators for initial lattice states
 * Focuses on Domain Wall Boundary Conditions (DWBC)
 * Based on Figures 2 and 3 from David Allison & Reshetikhin (2005) paper: arXiv:cond-mat/0502314v1
 */

import { generateDWBCHighCorrectIce, generateDWBCLowCorrectIce } from './dwbcCorrectIce';
import type {
  LatticeState,
  Position,
  Vertex,
  DWBCConfig,
  VertexConfiguration,
  BoundaryCondition,
} from './types';
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

// Old implementation kept for reference
function generateDWBCHighOld(size: number): LatticeState {
  const vertices: Vertex[][] = [];
  const horizontalEdges: EdgeState[][] = [];
  const verticalEdges: EdgeState[][] = [];

  // Initialize edge arrays
  for (let row = 0; row <= size; row++) {
    horizontalEdges[row] = new Array(size + 1);
    verticalEdges[row] = new Array(size + 1);
  }

  // DWBC High boundary conditions:
  // Top boundary: all arrows point down (into lattice)
  for (let col = 0; col < size; col++) {
    verticalEdges[0][col] = EdgeState.In;
  }

  // Bottom boundary: all arrows point down (out of lattice)
  for (let col = 0; col < size; col++) {
    verticalEdges[size][col] = EdgeState.Out;
  }

  // Left boundary: all arrows point right (out of boundary, into lattice)
  for (let row = 0; row < size; row++) {
    horizontalEdges[row][0] = EdgeState.Out;
  }

  // Right boundary: all arrows point right (into boundary, out of lattice)
  for (let row = 0; row < size; row++) {
    horizontalEdges[row][size] = EdgeState.In;
  }

  // Create vertices according to Figure 2 pattern
  for (let row = 0; row < size; row++) {
    vertices[row] = [];
    for (let col = 0; col < size; col++) {
      let type: VertexType;

      // Anti-diagonal has c2 vertices
      if (row + col === size - 1) {
        type = VertexType.c2;
      }
      // Upper-left triangle has b1 vertices
      else if (row + col < size - 1) {
        type = VertexType.b1;
      }
      // Lower-right triangle has b2 vertices
      else {
        type = VertexType.b2;
      }

      // Determine configuration based on actual edge states
      // For DWBC, edges are already set by boundary conditions
      // We need to derive the configuration from the edges, not vice versa
      const configuration: VertexConfiguration = {
        left: col === 0 ? EdgeState.Out : horizontalEdges[row][col],
        right: col === size - 1 ? EdgeState.In : horizontalEdges[row][col + 1],
        top: row === 0 ? EdgeState.In : verticalEdges[row][col],
        bottom: row === size - 1 ? EdgeState.Out : verticalEdges[row + 1][col],
      };

      // For interior vertices, set edges to match the expected vertex type
      // But only if they haven't been set by boundary conditions
      if (row > 0 && row < size - 1 && col > 0 && col < size - 1) {
        const expectedConfig = getVertexConfiguration(type);
        horizontalEdges[row][col + 1] = expectedConfig.right;
        verticalEdges[row + 1][col] = expectedConfig.bottom;
      }

      vertices[row][col] = {
        position: { row, col },
        type,
        configuration,
      };
    }
  }

  return {
    width: size,
    height: size,
    vertices,
    horizontalEdges,
    verticalEdges,
  };
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

// Old implementation kept for reference
function generateDWBCLowOld(size: number): LatticeState {
  const vertices: Vertex[][] = [];
  const horizontalEdges: EdgeState[][] = [];
  const verticalEdges: EdgeState[][] = [];

  // Initialize edge arrays
  for (let row = 0; row <= size; row++) {
    horizontalEdges[row] = new Array(size + 1);
    verticalEdges[row] = new Array(size + 1);
  }

  // DWBC Low boundary conditions (opposite of High):
  // Top boundary: all arrows point up (out of lattice)
  for (let col = 0; col < size; col++) {
    verticalEdges[0][col] = EdgeState.Out;
  }

  // Bottom boundary: all arrows point up (into lattice)
  for (let col = 0; col < size; col++) {
    verticalEdges[size][col] = EdgeState.In;
  }

  // Left boundary: all arrows point left (into boundary)
  for (let row = 0; row < size; row++) {
    horizontalEdges[row][0] = EdgeState.In;
  }

  // Right boundary: all arrows point left (out of boundary)
  for (let row = 0; row < size; row++) {
    horizontalEdges[row][size] = EdgeState.Out;
  }

  // Create vertices according to Figure 3 pattern
  for (let row = 0; row < size; row++) {
    vertices[row] = [];
    for (let col = 0; col < size; col++) {
      let type: VertexType;

      // Main diagonal has c2 vertices
      if (row === col) {
        type = VertexType.c2;
      }
      // Upper-right triangle has a1 vertices
      else if (col > row) {
        type = VertexType.a1;
      }
      // Lower-left triangle has a2 vertices
      else {
        type = VertexType.a2;
      }

      // Get the configuration for this vertex type
      const configuration = getVertexConfiguration(type);

      // Set interior edges based on vertex configuration
      // Right edge (if not at boundary)
      if (col < size - 1) {
        horizontalEdges[row][col + 1] = configuration.right;
      }

      // Bottom edge (if not at boundary)
      if (row < size - 1) {
        verticalEdges[row + 1][col] = configuration.bottom;
      }

      vertices[row][col] = {
        position: { row, col },
        type,
        configuration,
      };
    }
  }

  return {
    width: size,
    height: size,
    vertices,
    horizontalEdges,
    verticalEdges,
  };
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
      const edges: Array<{ type: 'h' | 'v'; row: number; col: number }> = [];

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

      const configuration: VertexConfiguration = {
        left: horizontalEdges[row][col] === EdgeState.Out ? EdgeState.In : EdgeState.Out,
        right: horizontalEdges[row][col + 1],
        top: verticalEdges[row][col] === EdgeState.In ? EdgeState.Out : EdgeState.In,
        bottom: verticalEdges[row + 1][col],
      };

      vertices[row][col] = {
        position: { row, col },
        type: getVertexType(configuration) || vertexType,
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
