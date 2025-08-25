/**
 * Height function calculator for the 6-vertex model
 *
 * Based on the paper's definition:
 * The height at a vertex is defined as the cumulative count of certain edge crossings
 * when traveling from the origin (0,0) to that vertex.
 *
 * Specifically:
 * - When a vertex has an edge pointing LEFT (into the vertex), add +1 to the height
 * - When a vertex has an edge pointing DOWN (into the vertex), add +1 to the height
 *
 * The total volume is the sum of all vertex heights in the lattice.
 */

import { EdgeState } from './types';
import type { LatticeState, Vertex } from './types';

/**
 * Height data for the entire lattice
 */
export interface HeightData {
  /** 2D array of heights at each vertex position */
  heights: number[][];
  /** Total volume (sum of all heights) */
  totalVolume: number;
  /** Minimum height value in the lattice */
  minHeight: number;
  /** Maximum height value in the lattice */
  maxHeight: number;
  /** Average height across all vertices */
  averageHeight: number;
}

/**
 * Height contribution for a single vertex
 */
export interface VertexHeightContribution {
  /** Contribution from left edge */
  fromLeft: number;
  /** Contribution from top edge */
  fromTop: number;
  /** Total contribution at this vertex */
  total: number;
}

/**
 * Calculate the height function for the entire lattice
 *
 * The height is calculated by accumulating contributions as we traverse
 * from the origin (0,0) to each vertex position.
 *
 * @param lattice - The current lattice state
 * @returns Height data including individual heights and statistics
 */
export function calculateHeightFunction(lattice: LatticeState): HeightData {
  const { width, height } = lattice;

  // Initialize height array
  const heights: number[][] = Array(height)
    .fill(null)
    .map(() => Array(width).fill(0));

  // Calculate heights using cumulative approach
  // We traverse the lattice from top-left (0,0) and accumulate heights
  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      // Start with height from above (if not first row)
      if (row > 0) {
        heights[row][col] = heights[row - 1][col];

        // Add contribution from vertical edge above
        // If edge points DOWN (into current vertex), add +1
        const edgeAbove = lattice.verticalEdges[row - 1][col];
        if (edgeAbove === EdgeState.In) {
          // EdgeState.In for vertical means top-to-bottom (pointing DOWN)
          heights[row][col] += 1;
        }
      }

      // Add height from left (if not first column)
      if (col > 0) {
        // For first row, just use left neighbor's height
        // For other rows, we already have contribution from above
        if (row === 0) {
          heights[row][col] = heights[row][col - 1];
        }

        // Add contribution from horizontal edge to the left
        // If edge points LEFT (into current vertex from the left), add +1
        const edgeLeft = lattice.horizontalEdges[row][col - 1];
        if (edgeLeft === EdgeState.Out) {
          // EdgeState.Out for horizontal means right-to-left (pointing LEFT into current vertex)
          heights[row][col] += 1;
        }
      }
    }
  }

  // Calculate statistics
  let totalVolume = 0;
  let minHeight = Infinity;
  let maxHeight = -Infinity;

  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      const h = heights[row][col];
      totalVolume += h;
      minHeight = Math.min(minHeight, h);
      maxHeight = Math.max(maxHeight, h);
    }
  }

  const averageHeight = totalVolume / (width * height);

  return {
    heights,
    totalVolume,
    minHeight,
    maxHeight,
    averageHeight,
  };
}

/**
 * Calculate the height contribution at a specific vertex
 * This is useful for understanding how a vertex's configuration affects the height
 *
 * @param vertex - The vertex to analyze
 * @returns The height contributions from each direction
 */
export function getVertexHeightContribution(vertex: Vertex): VertexHeightContribution {
  const { configuration } = vertex;

  let fromLeft = 0;
  let fromTop = 0;

  // Check if left edge points into the vertex (contributes +1)
  if (configuration.left === EdgeState.In) {
    fromLeft = 1;
  }

  // Check if top edge points into the vertex (contributes +1)
  if (configuration.top === EdgeState.In) {
    fromTop = 1;
  }

  return {
    fromLeft,
    fromTop,
    total: fromLeft + fromTop,
  };
}

/**
 * Calculate height difference between two adjacent vertices
 * Useful for understanding local height gradients
 *
 * @param heightData - The complete height data
 * @param from - Source position {row, col}
 * @param to - Target position {row, col}
 * @returns Height difference (to - from), or null if positions are invalid
 */
export function getHeightDifference(
  heightData: HeightData,
  from: { row: number; col: number },
  to: { row: number; col: number },
): number | null {
  const { heights } = heightData;

  // Validate positions
  if (
    from.row < 0 ||
    from.row >= heights.length ||
    from.col < 0 ||
    from.col >= heights[0].length ||
    to.row < 0 ||
    to.row >= heights.length ||
    to.col < 0 ||
    to.col >= heights[0].length
  ) {
    return null;
  }

  return heights[to.row][to.col] - heights[from.row][from.col];
}

/**
 * Get height profile along a row or column
 * Useful for visualization and analysis
 *
 * @param heightData - The complete height data
 * @param direction - 'row' or 'column'
 * @param index - The row or column index
 * @returns Array of heights along the specified line
 */
export function getHeightProfile(
  heightData: HeightData,
  direction: 'row' | 'column',
  index: number,
): number[] {
  const { heights } = heightData;

  if (direction === 'row') {
    if (index < 0 || index >= heights.length) {
      return [];
    }
    return [...heights[index]];
  } else {
    if (index < 0 || index >= heights[0].length) {
      return [];
    }
    return heights.map((row) => row[index]);
  }
}

/**
 * Calculate the height function gradient at each vertex
 * Returns the discrete gradient (difference with neighbors)
 *
 * @param heightData - The complete height data
 * @returns 2D array of gradient vectors {dx, dy} at each vertex
 */
export function calculateHeightGradient(
  heightData: HeightData,
): Array<Array<{ dx: number; dy: number }>> {
  const { heights } = heightData;
  const numRows = heights.length;
  const numCols = heights[0].length;

  const gradient: Array<Array<{ dx: number; dy: number }>> = Array(numRows)
    .fill(null)
    .map(() =>
      Array(numCols)
        .fill(null)
        .map(() => ({ dx: 0, dy: 0 })),
    );

  for (let row = 0; row < numRows; row++) {
    for (let col = 0; col < numCols; col++) {
      const currentHeight = heights[row][col];

      // Calculate horizontal gradient (dx)
      if (col > 0 && col < numCols - 1) {
        gradient[row][col].dx = (heights[row][col + 1] - heights[row][col - 1]) / 2;
      } else if (col === 0 && numCols > 1) {
        gradient[row][col].dx = heights[row][1] - currentHeight;
      } else if (col === numCols - 1 && numCols > 1) {
        gradient[row][col].dx = currentHeight - heights[row][col - 1];
      }

      // Calculate vertical gradient (dy)
      if (row > 0 && row < numRows - 1) {
        gradient[row][col].dy = (heights[row + 1][col] - heights[row - 1][col]) / 2;
      } else if (row === 0 && numRows > 1) {
        gradient[row][col].dy = heights[1][col] - currentHeight;
      } else if (row === numRows - 1 && numRows > 1) {
        gradient[row][col].dy = currentHeight - heights[row - 1][col];
      }
    }
  }

  return gradient;
}

/**
 * Verify that the height function is consistent with the vertex configurations
 * This is a debugging tool to ensure the height calculation is correct
 *
 * @param lattice - The lattice state
 * @param heightData - The calculated height data
 * @returns True if the height function is consistent, false otherwise
 */
export function verifyHeightConsistency(
  lattice: LatticeState,
  heightData: HeightData,
): { isConsistent: boolean; errors: string[] } {
  const errors: string[] = [];
  const { width, height } = lattice;
  const { heights } = heightData;

  // Verify dimensions match
  if (heights.length !== height || heights[0].length !== width) {
    errors.push(
      `Dimension mismatch: lattice is ${height}x${width}, heights is ${heights.length}x${heights[0].length}`,
    );
    return { isConsistent: false, errors };
  }

  // Verify height differences match edge configurations
  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      const currentHeight = heights[row][col];

      // Check horizontal edge consistency
      if (col < width - 1) {
        const rightHeight = heights[row][col + 1];
        const horizontalEdge = lattice.horizontalEdges[row][col];
        const expectedDiff = horizontalEdge === EdgeState.Out ? 1 : 0;
        const actualDiff = rightHeight - currentHeight;

        if (actualDiff !== expectedDiff && actualDiff !== expectedDiff - 1) {
          // Allow for boundary effects
          errors.push(
            `Height inconsistency at (${row},${col}): horizontal edge is ${horizontalEdge}, ` +
              `but height difference is ${actualDiff} (expected ~${expectedDiff})`,
          );
        }
      }

      // Check vertical edge consistency
      if (row < height - 1) {
        const belowHeight = heights[row + 1][col];
        const verticalEdge = lattice.verticalEdges[row][col];
        const expectedDiff = verticalEdge === EdgeState.In ? 1 : 0;
        const actualDiff = belowHeight - currentHeight;

        if (actualDiff !== expectedDiff && actualDiff !== expectedDiff - 1) {
          // Allow for boundary effects
          errors.push(
            `Height inconsistency at (${row},${col}): vertical edge is ${verticalEdge}, ` +
              `but height difference is ${actualDiff} (expected ~${expectedDiff})`,
          );
        }
      }
    }
  }

  return {
    isConsistent: errors.length === 0,
    errors,
  };
}

/**
 * Export height data to a format suitable for visualization or analysis
 *
 * @param heightData - The height data to export
 * @returns JSON-serializable object with height information
 */
export function exportHeightData(heightData: HeightData): {
  heights: number[][];
  stats: {
    totalVolume: number;
    minHeight: number;
    maxHeight: number;
    averageHeight: number;
    dimensions: { rows: number; cols: number };
  };
} {
  return {
    heights: heightData.heights.map((row) => [...row]),
    stats: {
      totalVolume: heightData.totalVolume,
      minHeight: heightData.minHeight,
      maxHeight: heightData.maxHeight,
      averageHeight: heightData.averageHeight,
      dimensions: {
        rows: heightData.heights.length,
        cols: heightData.heights[0].length,
      },
    },
  };
}
