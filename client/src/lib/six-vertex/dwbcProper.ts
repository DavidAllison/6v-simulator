/**
 * Proper DWBC Implementation with Ice Rule Satisfaction
 *
 * Key insight: The DWBC patterns from the paper already satisfy the ice rule
 * when properly constructed. We need to build edges consistently.
 */

import type { LatticeState, Vertex, VertexConfiguration } from './types';
import { VertexType, EdgeState } from './types';

/**
 * Generate DWBC High configuration
 *
 * DWBC High has:
 * - All top boundary arrows pointing down (into lattice)
 * - All bottom boundary arrows pointing down (out of lattice)
 * - All left boundary arrows pointing right (into lattice)
 * - All right boundary arrows pointing right (out of lattice)
 *
 * This creates a flow pattern where paths enter from top-left and exit bottom-right
 */
export function generateDWBCHighProper(size: number): LatticeState {
  console.log(`[DWBC High Proper] Generating for size ${size}`);

  const vertices: Vertex[][] = [];
  const horizontalEdges: EdgeState[][] = [];
  const verticalEdges: EdgeState[][] = [];

  // Initialize all edges
  for (let i = 0; i <= size; i++) {
    horizontalEdges[i] = new Array(size + 1);
    verticalEdges[i] = new Array(size);
  }

  // Set boundary conditions for DWBC High
  // Top boundary: all pointing down (into lattice)
  for (let col = 0; col < size; col++) {
    verticalEdges[0][col] = EdgeState.In;
  }

  // Bottom boundary: all pointing down (out of lattice)
  for (let col = 0; col < size; col++) {
    verticalEdges[size][col] = EdgeState.Out;
  }

  // Left boundary: all pointing right (into lattice)
  for (let row = 0; row < size; row++) {
    horizontalEdges[row][0] = EdgeState.Out;
  }

  // Right boundary: all pointing right (out of lattice)
  for (let row = 0; row < size; row++) {
    horizontalEdges[row][size] = EdgeState.In;
  }

  // Now build the internal structure based on vertex types
  // For DWBC High: c₂ on anti-diagonal, b₁ above, b₂ below
  for (let row = 0; row < size; row++) {
    vertices[row] = [];
    for (let col = 0; col < size; col++) {
      let type: VertexType;

      if (row + col === size - 1) {
        // Anti-diagonal: c₂ vertices
        type = VertexType.c2;
      } else if (row + col < size - 1) {
        // Upper-left triangle: b₁ vertices
        type = VertexType.b1;
      } else {
        // Lower-right triangle: b₂ vertices
        type = VertexType.b2;
      }

      // Set internal edges based on vertex type
      // We only set edges that haven't been set by boundaries or previous vertices
      if (col < size - 1 && horizontalEdges[row][col + 1] === undefined) {
        // Set right edge based on vertex type
        switch (type) {
          case VertexType.b1:
            // b₁: horizontal flow (both edges same direction)
            horizontalEdges[row][col + 1] = EdgeState.In;
            break;
          case VertexType.b2:
            // b₂: horizontal flow out
            horizontalEdges[row][col + 1] = EdgeState.Out;
            break;
          case VertexType.c2:
            // c₂: turns flow from vertical to horizontal
            horizontalEdges[row][col + 1] = EdgeState.In;
            break;
        }
      }

      if (row < size - 1 && verticalEdges[row + 1][col] === undefined) {
        // Set bottom edge based on vertex type
        switch (type) {
          case VertexType.b1:
            // b₁: vertical flow out
            verticalEdges[row + 1][col] = EdgeState.Out;
            break;
          case VertexType.b2:
            // b₂: vertical flow (both edges same direction)
            verticalEdges[row + 1][col] = EdgeState.In;
            break;
          case VertexType.c2:
            // c₂: turns flow
            verticalEdges[row + 1][col] = EdgeState.Out;
            break;
        }
      }

      // Build configuration from edges
      const left = horizontalEdges[row][col];
      const right = horizontalEdges[row][col + 1];
      const top = verticalEdges[row][col];
      const bottom = verticalEdges[row + 1][col];

      // Convert edge states to vertex perspective
      const configuration: VertexConfiguration = {
        left: left === EdgeState.Out ? EdgeState.In : EdgeState.Out,
        right: right === EdgeState.In ? EdgeState.In : EdgeState.Out,
        top: top === EdgeState.In ? EdgeState.In : EdgeState.Out,
        bottom: bottom === EdgeState.Out ? EdgeState.Out : EdgeState.In,
      };

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
 * Generate DWBC Low configuration
 *
 * DWBC Low has opposite boundary conditions from High:
 * - All top boundary arrows pointing up (out of lattice)
 * - All bottom boundary arrows pointing up (into lattice)
 * - All left boundary arrows pointing left (out of lattice)
 * - All right boundary arrows pointing left (into lattice)
 */
export function generateDWBCLowProper(size: number): LatticeState {
  console.log(`[DWBC Low Proper] Generating for size ${size}`);

  const vertices: Vertex[][] = [];
  const horizontalEdges: EdgeState[][] = [];
  const verticalEdges: EdgeState[][] = [];

  // Initialize all edges
  for (let i = 0; i <= size; i++) {
    horizontalEdges[i] = new Array(size + 1);
    verticalEdges[i] = new Array(size);
  }

  // Set boundary conditions for DWBC Low
  // Top boundary: all pointing up (out of lattice)
  for (let col = 0; col < size; col++) {
    verticalEdges[0][col] = EdgeState.Out;
  }

  // Bottom boundary: all pointing up (into lattice)
  for (let col = 0; col < size; col++) {
    verticalEdges[size][col] = EdgeState.In;
  }

  // Left boundary: all pointing left (out of lattice)
  for (let row = 0; row < size; row++) {
    horizontalEdges[row][0] = EdgeState.In;
  }

  // Right boundary: all pointing left (into lattice)
  for (let row = 0; row < size; row++) {
    horizontalEdges[row][size] = EdgeState.Out;
  }

  // Build internal structure
  // For DWBC Low: c₂ on main diagonal, a₁ above, a₂ below
  for (let row = 0; row < size; row++) {
    vertices[row] = [];
    for (let col = 0; col < size; col++) {
      let type: VertexType;

      if (row === col) {
        // Main diagonal: c₂ vertices
        type = VertexType.c2;
      } else if (row < col) {
        // Upper-right triangle: a₁ vertices
        type = VertexType.a1;
      } else {
        // Lower-left triangle: a₂ vertices
        type = VertexType.a2;
      }

      // Set internal edges
      if (col < size - 1 && horizontalEdges[row][col + 1] === undefined) {
        switch (type) {
          case VertexType.a1:
            // a₁: flow pattern left-top in, right-bottom out
            horizontalEdges[row][col + 1] = EdgeState.Out;
            break;
          case VertexType.a2:
            // a₂: flow pattern right-bottom in, left-top out
            horizontalEdges[row][col + 1] = EdgeState.In;
            break;
          case VertexType.c2:
            // c₂: turns flow
            horizontalEdges[row][col + 1] = EdgeState.In;
            break;
        }
      }

      if (row < size - 1 && verticalEdges[row + 1][col] === undefined) {
        switch (type) {
          case VertexType.a1:
            // a₁: bottom out
            verticalEdges[row + 1][col] = EdgeState.Out;
            break;
          case VertexType.a2:
            // a₂: bottom in
            verticalEdges[row + 1][col] = EdgeState.In;
            break;
          case VertexType.c2:
            // c₂: turns flow
            verticalEdges[row + 1][col] = EdgeState.Out;
            break;
        }
      }

      // Build configuration
      const left = horizontalEdges[row][col];
      const right = horizontalEdges[row][col + 1];
      const top = verticalEdges[row][col];
      const bottom = verticalEdges[row + 1][col];

      // Convert to vertex perspective
      const configuration: VertexConfiguration = {
        left: left === EdgeState.In ? EdgeState.Out : EdgeState.In,
        right: right === EdgeState.Out ? EdgeState.Out : EdgeState.In,
        top: top === EdgeState.Out ? EdgeState.Out : EdgeState.In,
        bottom: bottom === EdgeState.In ? EdgeState.In : EdgeState.Out,
      };

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
