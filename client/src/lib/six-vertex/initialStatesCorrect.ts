/**
 * Correct DWBC generation that doesn't overwrite edges
 */

import type { LatticeState, Vertex, VertexConfiguration } from './types';
import { VertexType, EdgeState } from './types';

/**
 * Generate DWBC High configuration - correct implementation
 *
 * Key insight: We need to set vertex types first, then derive edges
 * from the vertex configurations to ensure consistency
 */
export function generateDWBCHighCorrect(size: number): LatticeState {
  const vertices: Vertex[][] = [];

  // First, determine all vertex types based on position
  const vertexTypes: VertexType[][] = [];
  for (let row = 0; row < size; row++) {
    vertexTypes[row] = [];
    for (let col = 0; col < size; col++) {
      if (row + col === size - 1) {
        // Anti-diagonal: c2 vertices
        vertexTypes[row][col] = VertexType.c2;
      } else if (row + col < size - 1) {
        // Upper-left triangle: b1 vertices
        vertexTypes[row][col] = VertexType.b1;
      } else {
        // Lower-right triangle: b2 vertices
        vertexTypes[row][col] = VertexType.b2;
      }
    }
  }

  // Now set edges based on vertex types and DWBC boundary conditions
  const horizontalEdges: EdgeState[][] = Array(size)
    .fill(null)
    .map(() => Array(size + 1).fill(EdgeState.Out));
  const verticalEdges: EdgeState[][] = Array(size + 1)
    .fill(null)
    .map(() => Array(size).fill(EdgeState.Out));

  // Set DWBC boundary conditions
  // Top: arrows in (down)
  for (let col = 0; col < size; col++) {
    verticalEdges[0][col] = EdgeState.In;
  }
  // Bottom: arrows out (down)
  for (let col = 0; col < size; col++) {
    verticalEdges[size][col] = EdgeState.Out;
  }
  // Left: arrows out (right)
  for (let row = 0; row < size; row++) {
    horizontalEdges[row][0] = EdgeState.Out;
  }
  // Right: arrows in (left)
  for (let row = 0; row < size; row++) {
    horizontalEdges[row][size] = EdgeState.In;
  }

  // For DWBC High, we can derive interior edges from the pattern
  // The key is that arrows flow from upper-left to lower-right
  for (let row = 0; row < size - 1; row++) {
    for (let col = 0; col < size - 1; col++) {
      const type = vertexTypes[row][col];

      // Interior vertical edge (between row and row+1)
      if (type === VertexType.b1) {
        // b1: vertical arrows point down (out)
        verticalEdges[row + 1][col] = EdgeState.Out;
      } else if (type === VertexType.b2) {
        // b2: vertical arrows point up (in)
        verticalEdges[row + 1][col] = EdgeState.In;
      } else if (type === VertexType.c2) {
        // c2: vertical arrows point down (out)
        verticalEdges[row + 1][col] = EdgeState.Out;
      }

      // Interior horizontal edge (between col and col+1)
      if (type === VertexType.b1) {
        // b1: horizontal arrows point in from both sides
        horizontalEdges[row][col + 1] = EdgeState.In;
      } else if (type === VertexType.b2) {
        // b2: horizontal arrows point out to both sides
        horizontalEdges[row][col + 1] = EdgeState.Out;
      } else if (type === VertexType.c2) {
        // c2: horizontal arrows point left (in)
        horizontalEdges[row][col + 1] = EdgeState.In;
      }
    }
  }

  // Now create vertices with configurations read from edges
  for (let row = 0; row < size; row++) {
    vertices[row] = [];
    for (let col = 0; col < size; col++) {
      const configuration: VertexConfiguration = {
        left: horizontalEdges[row][col],
        right: horizontalEdges[row][col + 1],
        top: verticalEdges[row][col],
        bottom: verticalEdges[row + 1][col],
      };

      vertices[row][col] = {
        position: { row, col },
        type: vertexTypes[row][col],
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
 * Generate DWBC Low configuration - correct implementation
 */
export function generateDWBCLowCorrect(size: number): LatticeState {
  const vertices: Vertex[][] = [];

  // First, determine all vertex types based on position
  const vertexTypes: VertexType[][] = [];
  for (let row = 0; row < size; row++) {
    vertexTypes[row] = [];
    for (let col = 0; col < size; col++) {
      if (row === col) {
        // Main diagonal: c2 vertices
        vertexTypes[row][col] = VertexType.c2;
      } else if (row < col) {
        // Upper-right triangle: a1 vertices
        vertexTypes[row][col] = VertexType.a1;
      } else {
        // Lower-left triangle: a2 vertices
        vertexTypes[row][col] = VertexType.a2;
      }
    }
  }

  // Set edges based on vertex types and DWBC Low boundary conditions
  const horizontalEdges: EdgeState[][] = Array(size)
    .fill(null)
    .map(() => Array(size + 1).fill(EdgeState.Out));
  const verticalEdges: EdgeState[][] = Array(size + 1)
    .fill(null)
    .map(() => Array(size).fill(EdgeState.Out));

  // Set DWBC Low boundary conditions (opposite of High)
  // Top: arrows out (up)
  for (let col = 0; col < size; col++) {
    verticalEdges[0][col] = EdgeState.Out;
  }
  // Bottom: arrows in (up)
  for (let col = 0; col < size; col++) {
    verticalEdges[size][col] = EdgeState.In;
  }
  // Left: arrows in (left)
  for (let row = 0; row < size; row++) {
    horizontalEdges[row][0] = EdgeState.In;
  }
  // Right: arrows out (right)
  for (let row = 0; row < size; row++) {
    horizontalEdges[row][size] = EdgeState.Out;
  }

  // For DWBC Low, derive interior edges from the pattern
  for (let row = 0; row < size - 1; row++) {
    for (let col = 0; col < size - 1; col++) {
      const type = vertexTypes[row][col];

      // Interior vertical edge
      if (type === VertexType.a1) {
        // a1: vertical arrows point down (out)
        verticalEdges[row + 1][col] = EdgeState.Out;
      } else if (type === VertexType.a2) {
        // a2: vertical arrows point up (in)
        verticalEdges[row + 1][col] = EdgeState.In;
      } else if (type === VertexType.c2) {
        // c2: vertical arrows point down (out)
        verticalEdges[row + 1][col] = EdgeState.Out;
      }

      // Interior horizontal edge
      if (type === VertexType.a1) {
        // a1: horizontal arrows point right (out)
        horizontalEdges[row][col + 1] = EdgeState.Out;
      } else if (type === VertexType.a2) {
        // a2: horizontal arrows point left (in)
        horizontalEdges[row][col + 1] = EdgeState.In;
      } else if (type === VertexType.c2) {
        // c2: horizontal arrows point left (in)
        horizontalEdges[row][col + 1] = EdgeState.In;
      }
    }
  }

  // Create vertices with configurations read from edges
  for (let row = 0; row < size; row++) {
    vertices[row] = [];
    for (let col = 0; col < size; col++) {
      const configuration: VertexConfiguration = {
        left: horizontalEdges[row][col],
        right: horizontalEdges[row][col + 1],
        top: verticalEdges[row][col],
        bottom: verticalEdges[row + 1][col],
      };

      vertices[row][col] = {
        position: { row, col },
        type: vertexTypes[row][col],
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
