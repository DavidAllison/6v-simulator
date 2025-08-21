/**
 * DWBC Implementation with correct Ice Rule
 *
 * This implementation carefully constructs DWBC states that satisfy the ice rule
 * by ensuring edge consistency between neighboring vertices.
 */

import type { LatticeState, Vertex, VertexConfiguration } from './types';
import { VertexType, EdgeState } from './types';

/**
 * Helper to get the correct vertex configuration for each type
 * These are based on Figure 1 from the paper
 */
// function getCorrectConfiguration(type: VertexType): VertexConfiguration {
//   switch (type) {
//     case VertexType.a1:
//       // Left & top in, right & bottom out
//       return {
//         left: EdgeState.In,
//         top: EdgeState.In,
//         right: EdgeState.Out,
//         bottom: EdgeState.Out,
//       };

//     case VertexType.a2:
//       // Right & bottom in, left & top out
//       return {
//         right: EdgeState.In,
//         bottom: EdgeState.In,
//         left: EdgeState.Out,
//         top: EdgeState.Out,
//       };

//     case VertexType.b1:
//       // Left & right in, top & bottom out
//       return {
//         left: EdgeState.In,
//         right: EdgeState.In,
//         top: EdgeState.Out,
//         bottom: EdgeState.Out,
//       };

//     case VertexType.b2:
//       // Top & bottom in, left & right out
//       return {
//         top: EdgeState.In,
//         bottom: EdgeState.In,
//         left: EdgeState.Out,
//         right: EdgeState.Out,
//       };

//     case VertexType.c1:
//       // Left & bottom in, right & top out
//       return {
//         left: EdgeState.In,
//         bottom: EdgeState.In,
//         right: EdgeState.Out,
//         top: EdgeState.Out,
//       };

//     case VertexType.c2:
//       // Right & top in, left & bottom out
//       return {
//         right: EdgeState.In,
//         top: EdgeState.In,
//         left: EdgeState.Out,
//         bottom: EdgeState.Out,
//       };
//   }
// }

/**
 * Generate DWBC High with correct ice rule
 */
export function generateDWBCHighCorrectIce(size: number): LatticeState {
  // First, determine the vertex type pattern
  const vertexTypes: VertexType[][] = [];
  for (let row = 0; row < size; row++) {
    vertexTypes[row] = [];
    for (let col = 0; col < size; col++) {
      if (row + col === size - 1) {
        vertexTypes[row][col] = VertexType.c2; // Anti-diagonal
      } else if (row + col < size - 1) {
        vertexTypes[row][col] = VertexType.b1; // Upper-left
      } else {
        vertexTypes[row][col] = VertexType.b2; // Lower-right
      }
    }
  }

  // Initialize edges - using the lattice edge convention
  // horizontalEdges[row][col] is the edge to the left of vertex (row,col)
  // verticalEdges[row][col] is the edge above vertex (row,col)
  // Use literal strings to avoid any type issues
  const horizontalEdges: EdgeState[][] = Array(size)
    .fill(null)
    .map(() => Array(size + 1).fill('out' as EdgeState));
  const verticalEdges: EdgeState[][] = Array(size + 1)
    .fill(null)
    .map(() => Array(size).fill('out' as EdgeState));

  // For DWBC High, we need specific boundary conditions
  // These are from the lattice perspective (not vertex perspective)

  // Top boundary: arrows point down into lattice
  for (let col = 0; col < size; col++) {
    verticalEdges[0][col] = 'in' as EdgeState;
  }

  // Bottom boundary: arrows point down out of lattice
  for (let col = 0; col < size; col++) {
    verticalEdges[size][col] = 'out' as EdgeState;
  }

  // Left boundary: arrows point right into lattice
  for (let row = 0; row < size; row++) {
    horizontalEdges[row][0] = 'out' as EdgeState;
  }

  // Right boundary: arrows point right out of lattice
  for (let row = 0; row < size; row++) {
    horizontalEdges[row][size] = 'in' as EdgeState;
  }

  // Now we need to fill in the internal edges consistently
  // We'll process vertices in a specific order to ensure consistency
  const vertices: Vertex[][] = [];

  // Process row by row, left to right
  for (let row = 0; row < size; row++) {
    vertices[row] = [];
    for (let col = 0; col < size; col++) {
      const type = vertexTypes[row][col];

      // Get the actual edges around this vertex
      const leftEdge = horizontalEdges[row][col];
      const rightEdge = horizontalEdges[row][col + 1];
      const topEdge = verticalEdges[row][col];
      const bottomEdge = verticalEdges[row + 1][col];

      // For internal edges that haven't been set, use the ideal configuration
      if (col < size - 1 && row > 0 && row < size - 1) {
        // Internal right edge - set based on vertex type requirement
        if (type === VertexType.b1) {
          horizontalEdges[row][col + 1] = 'in' as EdgeState; // b1 needs right in
        } else if (type === VertexType.b2) {
          horizontalEdges[row][col + 1] = 'out' as EdgeState; // b2 needs right out
        } else if (type === VertexType.c2) {
          horizontalEdges[row][col + 1] = 'in' as EdgeState; // c2 needs right in
        }
      }

      if (row < size - 1 && col > 0 && col < size - 1) {
        // Internal bottom edge - set based on vertex type requirement
        if (type === VertexType.b1) {
          verticalEdges[row + 1][col] = 'out' as EdgeState; // b1 needs bottom out
        } else if (type === VertexType.b2) {
          verticalEdges[row + 1][col] = 'in' as EdgeState; // b2 needs bottom in
        } else if (type === VertexType.c2) {
          verticalEdges[row + 1][col] = 'out' as EdgeState; // c2 needs bottom out
        }
      }

      // Build the configuration from the perspective of the vertex
      // Edge directions are reversed from lattice perspective to vertex perspective
      const configuration: VertexConfiguration = {
        left: leftEdge === 'out' ? ('in' as EdgeState) : ('out' as EdgeState),
        right: rightEdge === 'in' ? ('in' as EdgeState) : ('out' as EdgeState),
        top: topEdge === 'in' ? ('in' as EdgeState) : ('out' as EdgeState),
        bottom: bottomEdge === 'out' ? ('out' as EdgeState) : ('in' as EdgeState),
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
 * Generate DWBC Low with correct ice rule
 */
export function generateDWBCLowCorrectIce(size: number): LatticeState {
  // Determine vertex types
  const vertexTypes: VertexType[][] = [];
  for (let row = 0; row < size; row++) {
    vertexTypes[row] = [];
    for (let col = 0; col < size; col++) {
      if (row === col) {
        vertexTypes[row][col] = VertexType.c2; // Main diagonal
      } else if (row < col) {
        vertexTypes[row][col] = VertexType.a1; // Upper-right
      } else {
        vertexTypes[row][col] = VertexType.a2; // Lower-left
      }
    }
  }

  // Initialize edges
  const horizontalEdges: EdgeState[][] = Array(size)
    .fill(null)
    .map(() => Array(size + 1).fill('out' as EdgeState));
  const verticalEdges: EdgeState[][] = Array(size + 1)
    .fill(null)
    .map(() => Array(size).fill('out' as EdgeState));

  // DWBC Low boundary conditions

  // Top boundary: arrows point up out of lattice
  for (let col = 0; col < size; col++) {
    verticalEdges[0][col] = 'out' as EdgeState;
  }

  // Bottom boundary: arrows point up into lattice
  for (let col = 0; col < size; col++) {
    verticalEdges[size][col] = 'in' as EdgeState;
  }

  // Left boundary: arrows point left out of lattice
  for (let row = 0; row < size; row++) {
    horizontalEdges[row][0] = 'in' as EdgeState;
  }

  // Right boundary: arrows point left into lattice
  for (let row = 0; row < size; row++) {
    horizontalEdges[row][size] = 'out' as EdgeState;
  }

  // Build vertices and set internal edges
  const vertices: Vertex[][] = [];

  for (let row = 0; row < size; row++) {
    vertices[row] = [];
    for (let col = 0; col < size; col++) {
      const type = vertexTypes[row][col];

      // Set internal edges based on vertex type
      if (col < size - 1 && row > 0 && row < size - 1) {
        if (type === VertexType.a1) {
          horizontalEdges[row][col + 1] = 'out' as EdgeState; // a1 needs right out
        } else if (type === VertexType.a2) {
          horizontalEdges[row][col + 1] = 'in' as EdgeState; // a2 needs right in
        } else if (type === VertexType.c2) {
          horizontalEdges[row][col + 1] = 'in' as EdgeState; // c2 needs right in
        }
      }

      if (row < size - 1 && col > 0 && col < size - 1) {
        if (type === VertexType.a1) {
          verticalEdges[row + 1][col] = 'out' as EdgeState; // a1 needs bottom out
        } else if (type === VertexType.a2) {
          verticalEdges[row + 1][col] = 'in' as EdgeState; // a2 needs bottom in
        } else if (type === VertexType.c2) {
          verticalEdges[row + 1][col] = 'out' as EdgeState; // c2 needs bottom out
        }
      }

      // Get edges
      const leftEdge = horizontalEdges[row][col];
      const rightEdge = horizontalEdges[row][col + 1];
      const topEdge = verticalEdges[row][col];
      const bottomEdge = verticalEdges[row + 1][col];

      // Convert to vertex perspective
      const configuration: VertexConfiguration = {
        left: leftEdge === 'in' ? ('out' as EdgeState) : ('in' as EdgeState),
        right: rightEdge === 'out' ? ('out' as EdgeState) : ('in' as EdgeState),
        top: topEdge === 'out' ? ('out' as EdgeState) : ('in' as EdgeState),
        bottom: bottomEdge === 'in' ? ('in' as EdgeState) : ('out' as EdgeState),
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
