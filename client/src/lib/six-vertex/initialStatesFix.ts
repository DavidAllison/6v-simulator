/**
 * Fixed DWBC generation that properly handles all lattice sizes
 */

import type { LatticeState, Vertex, VertexConfiguration } from './types';
import { VertexType, EdgeState } from './types';

/**
 * Generate DWBC High configuration - works for all sizes
 */
export function generateDWBCHighFixed(size: number): LatticeState {
  const vertices: Vertex[][] = [];

  // Initialize all edges - need size+1 for boundaries
  const horizontalEdges: EdgeState[][] = Array(size)
    .fill(null)
    .map(() => Array(size + 1).fill(EdgeState.Out));
  const verticalEdges: EdgeState[][] = Array(size + 1)
    .fill(null)
    .map(() => Array(size).fill(EdgeState.Out));

  // DWBC High boundary conditions:
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

  // Now determine vertex types based on position (from paper's Figure 2)
  for (let row = 0; row < size; row++) {
    vertices[row] = [];
    for (let col = 0; col < size; col++) {
      let type: VertexType;

      // Determine vertex type by position
      if (row + col === size - 1) {
        // Anti-diagonal: c2 vertices
        type = VertexType.c2;
        // c2: in from right & top, out to left & bottom
        if (col < size - 1) horizontalEdges[row][col + 1] = EdgeState.In;
        if (row < size - 1) verticalEdges[row + 1][col] = EdgeState.Out;
        if (col > 0) horizontalEdges[row][col] = EdgeState.Out;
        if (row > 0) verticalEdges[row][col] = EdgeState.In;
      } else if (row + col < size - 1) {
        // Upper-left triangle: b1 vertices
        type = VertexType.b1;
        // b1: in from left & right, out to top & bottom
        if (col < size - 1) horizontalEdges[row][col + 1] = EdgeState.In;
        if (row < size - 1) verticalEdges[row + 1][col] = EdgeState.Out;
        if (col > 0) horizontalEdges[row][col] = EdgeState.In;
        if (row > 0) verticalEdges[row][col] = EdgeState.Out;
      } else {
        // Lower-right triangle: b2 vertices
        type = VertexType.b2;
        // b2: in from top & bottom, out to left & right
        if (col < size - 1) horizontalEdges[row][col + 1] = EdgeState.Out;
        if (row < size - 1) verticalEdges[row + 1][col] = EdgeState.In;
        if (col > 0) horizontalEdges[row][col] = EdgeState.Out;
        if (row > 0) verticalEdges[row][col] = EdgeState.In;
      }

      // Read configuration from edges
      const configuration: VertexConfiguration = {
        left: horizontalEdges[row][col],
        right: horizontalEdges[row][col + 1],
        top: verticalEdges[row][col],
        bottom: verticalEdges[row + 1][col],
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
 * Generate DWBC Low configuration - works for all sizes
 */
export function generateDWBCLowFixed(size: number): LatticeState {
  const vertices: Vertex[][] = [];

  // Initialize all edges
  const horizontalEdges: EdgeState[][] = Array(size)
    .fill(null)
    .map(() => Array(size + 1).fill(EdgeState.Out));
  const verticalEdges: EdgeState[][] = Array(size + 1)
    .fill(null)
    .map(() => Array(size).fill(EdgeState.Out));

  // DWBC Low boundary conditions (opposite of High):
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

  // Determine vertex types based on position (from paper's Figure 3)
  for (let row = 0; row < size; row++) {
    vertices[row] = [];
    for (let col = 0; col < size; col++) {
      let type: VertexType;

      if (row === col) {
        // Main diagonal: c2 vertices
        type = VertexType.c2;
        // c2: in from right & top, out to left & bottom
        if (col < size - 1) horizontalEdges[row][col + 1] = EdgeState.In;
        if (row < size - 1) verticalEdges[row + 1][col] = EdgeState.Out;
        if (col > 0) horizontalEdges[row][col] = EdgeState.Out;
        if (row > 0) verticalEdges[row][col] = EdgeState.In;
      } else if (row < col) {
        // Upper-right triangle: a1 vertices
        type = VertexType.a1;
        // a1: in from left & top, out to right & bottom
        if (col < size - 1) horizontalEdges[row][col + 1] = EdgeState.Out;
        if (row < size - 1) verticalEdges[row + 1][col] = EdgeState.Out;
        if (col > 0) horizontalEdges[row][col] = EdgeState.In;
        if (row > 0) verticalEdges[row][col] = EdgeState.In;
      } else {
        // Lower-left triangle: a2 vertices
        type = VertexType.a2;
        // a2: in from right & bottom, out to left & top
        if (col < size - 1) horizontalEdges[row][col + 1] = EdgeState.In;
        if (row < size - 1) verticalEdges[row + 1][col] = EdgeState.In;
        if (col > 0) horizontalEdges[row][col] = EdgeState.Out;
        if (row > 0) verticalEdges[row][col] = EdgeState.Out;
      }

      // Read configuration from edges
      const configuration: VertexConfiguration = {
        left: horizontalEdges[row][col],
        right: horizontalEdges[row][col + 1],
        top: verticalEdges[row][col],
        bottom: verticalEdges[row + 1][col],
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
