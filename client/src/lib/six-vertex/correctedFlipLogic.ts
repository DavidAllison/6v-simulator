/**
 * Corrected flip logic for the 6-vertex model
 * Ensures ALL 4 vertices in a 2x2 plaquette are properly transformed
 * Based on the reference C implementation
 */

import { FlipDirection } from './physicsFlips';

// Numeric constants for performance
export const VERTEX_A1 = 0;
export const VERTEX_A2 = 1;
export const VERTEX_B1 = 2;
export const VERTEX_B2 = 3;
export const VERTEX_C1 = 4;
export const VERTEX_C2 = 5;

/**
 * Apply flip transformation to a 2x2 plaquette
 * CRITICAL: This function MUST update ALL 4 vertices atomically
 *
 * For UP flip, the plaquette positions are:
 *   v4(upper) -- v3(upper-right)
 *      |             |
 *   v1(base)  -- v2(right)
 *
 * For DOWN flip, the plaquette positions are:
 *   v4(left)  -- v3(base)
 *      |            |
 *   v1(down-left) -- v2(down)
 */
export function applyFlipTransformationCorrected(
  v1: number,
  v2: number,
  v3: number,
  v4: number,
  direction: FlipDirection,
): { new1: number; new2: number; new3: number; new4: number } | null {
  if (direction === FlipDirection.Up) {
    // UP flip transformations from the C code
    // Each transformation pattern must update ALL 4 vertices

    // Pattern 1: a1-b2-a2-b1 → c1-c2-c1-c2
    if (v1 === VERTEX_A1 && v2 === VERTEX_B2 && v3 === VERTEX_A2 && v4 === VERTEX_B1) {
      return { new1: VERTEX_C1, new2: VERTEX_C2, new3: VERTEX_C1, new4: VERTEX_C2 };
    }

    // Pattern 2: c2-c1-c2-c1 → a2-b1-a1-b2
    if (v1 === VERTEX_C2 && v2 === VERTEX_C1 && v3 === VERTEX_C2 && v4 === VERTEX_C1) {
      return { new1: VERTEX_A2, new2: VERTEX_B1, new3: VERTEX_A1, new4: VERTEX_B2 };
    }

    // Pattern 3: a1-c1-a2-c2 → c1-b1-c1-b2
    if (v1 === VERTEX_A1 && v2 === VERTEX_C1 && v3 === VERTEX_A2 && v4 === VERTEX_C2) {
      return { new1: VERTEX_C1, new2: VERTEX_B1, new3: VERTEX_C1, new4: VERTEX_B2 };
    }

    // Pattern 4: c2-b2-c2-b1 → a2-c2-a1-c2 (fixed: b1→c2 not c1)
    if (v1 === VERTEX_C2 && v2 === VERTEX_B2 && v3 === VERTEX_C2 && v4 === VERTEX_B1) {
      return { new1: VERTEX_A2, new2: VERTEX_C2, new3: VERTEX_A1, new4: VERTEX_C2 };
    }

    // Pattern 5: a1-b2-c2-c1 → c1-c2-a1-b2
    if (v1 === VERTEX_A1 && v2 === VERTEX_B2 && v3 === VERTEX_C2 && v4 === VERTEX_C1) {
      return { new1: VERTEX_C1, new2: VERTEX_C2, new3: VERTEX_A1, new4: VERTEX_B2 };
    }

    // Pattern 6: c2-c1-a2-b1 → a2-b1-c1-c2
    if (v1 === VERTEX_C2 && v2 === VERTEX_C1 && v3 === VERTEX_A2 && v4 === VERTEX_B1) {
      return { new1: VERTEX_A2, new2: VERTEX_B1, new3: VERTEX_C1, new4: VERTEX_C2 };
    }

    // Additional patterns for completeness
    // Pattern 7: b1-a1-b2-a2 → b2-a2-b1-a1
    if (v1 === VERTEX_B1 && v2 === VERTEX_A1 && v3 === VERTEX_B2 && v4 === VERTEX_A2) {
      return { new1: VERTEX_B2, new2: VERTEX_A2, new3: VERTEX_B1, new4: VERTEX_A1 };
    }

    // Pattern 8: b2-a2-b1-a1 → b1-a1-b2-a2
    if (v1 === VERTEX_B2 && v2 === VERTEX_A2 && v3 === VERTEX_B1 && v4 === VERTEX_A1) {
      return { new1: VERTEX_B1, new2: VERTEX_A1, new3: VERTEX_B2, new4: VERTEX_A2 };
    }

    // Pattern 9: c1-b1-c1-b2 → a1-c1-a2-c2
    if (v1 === VERTEX_C1 && v2 === VERTEX_B1 && v3 === VERTEX_C1 && v4 === VERTEX_B2) {
      return { new1: VERTEX_A1, new2: VERTEX_C1, new3: VERTEX_A2, new4: VERTEX_C2 };
    }

    // Pattern 10: a2-c2-a1-c1 → c2-b2-c2-b1
    if (v1 === VERTEX_A2 && v2 === VERTEX_C2 && v3 === VERTEX_A1 && v4 === VERTEX_C1) {
      return { new1: VERTEX_C2, new2: VERTEX_B2, new3: VERTEX_C2, new4: VERTEX_B1 };
    }
  } else {
    // FlipDirection.Down
    // DOWN flip transformations
    // For down flip, remember the vertex positions are different:
    // v1=down-left, v2=down, v3=base, v4=left

    // Pattern 1: a2-b1-a1-b2 → c2-c1-c2-c1
    if (v1 === VERTEX_A2 && v2 === VERTEX_B1 && v3 === VERTEX_A1 && v4 === VERTEX_B2) {
      return { new1: VERTEX_C2, new2: VERTEX_C1, new3: VERTEX_C2, new4: VERTEX_C1 };
    }

    // Pattern 2: c1-c2-c1-c2 → a1-b2-a2-b1
    if (v1 === VERTEX_C1 && v2 === VERTEX_C2 && v3 === VERTEX_C1 && v4 === VERTEX_C2) {
      return { new1: VERTEX_A1, new2: VERTEX_B2, new3: VERTEX_A2, new4: VERTEX_B1 };
    }

    // Pattern 3: a2-c2-a1-c1 → c2-b2-c2-b1
    if (v1 === VERTEX_A2 && v2 === VERTEX_C2 && v3 === VERTEX_A1 && v4 === VERTEX_C1) {
      return { new1: VERTEX_C2, new2: VERTEX_B2, new3: VERTEX_C2, new4: VERTEX_B1 };
    }

    // Pattern 4: c1-b1-c1-b2 → a1-c1-a2-c2
    if (v1 === VERTEX_C1 && v2 === VERTEX_B1 && v3 === VERTEX_C1 && v4 === VERTEX_B2) {
      return { new1: VERTEX_A1, new2: VERTEX_C1, new3: VERTEX_A2, new4: VERTEX_C2 };
    }

    // Pattern 5: a2-b1-c1-c2 → c2-c1-a2-b1
    if (v1 === VERTEX_A2 && v2 === VERTEX_B1 && v3 === VERTEX_C1 && v4 === VERTEX_C2) {
      return { new1: VERTEX_C2, new2: VERTEX_C1, new3: VERTEX_A2, new4: VERTEX_B1 };
    }

    // Pattern 6: c1-c2-a1-b2 → a1-b2-c2-c1
    if (v1 === VERTEX_C1 && v2 === VERTEX_C2 && v3 === VERTEX_A1 && v4 === VERTEX_B2) {
      return { new1: VERTEX_A1, new2: VERTEX_B2, new3: VERTEX_C2, new4: VERTEX_C1 };
    }

    // Additional patterns
    // Pattern 7: b2-a2-b1-a1 → b1-a1-b2-a2
    if (v1 === VERTEX_B2 && v2 === VERTEX_A2 && v3 === VERTEX_B1 && v4 === VERTEX_A1) {
      return { new1: VERTEX_B1, new2: VERTEX_A1, new3: VERTEX_B2, new4: VERTEX_A2 };
    }

    // Pattern 8: b1-a1-b2-a2 → b2-a2-b1-a1
    if (v1 === VERTEX_B1 && v2 === VERTEX_A1 && v3 === VERTEX_B2 && v4 === VERTEX_A2) {
      return { new1: VERTEX_B2, new2: VERTEX_A2, new3: VERTEX_B1, new4: VERTEX_A1 };
    }

    // Pattern 9: c2-b2-c2-b1 → a2-c2-a1-c2 (fixed to match UP Pattern 4)
    if (v1 === VERTEX_C2 && v2 === VERTEX_B2 && v3 === VERTEX_C2 && v4 === VERTEX_B1) {
      return { new1: VERTEX_A2, new2: VERTEX_C2, new3: VERTEX_A1, new4: VERTEX_C2 };
    }

    // Pattern 10: a1-c1-a2-c2 → c1-b1-c1-b2
    if (v1 === VERTEX_A1 && v2 === VERTEX_C1 && v3 === VERTEX_A2 && v4 === VERTEX_C2) {
      return { new1: VERTEX_C1, new2: VERTEX_B1, new3: VERTEX_C1, new4: VERTEX_B2 };
    }
  }

  // No valid transformation found
  return null;
}

/**
 * Check if a flip at the given position is valid
 */
export function isFlipValidCorrected(
  vertices: Int8Array | Uint8Array,
  size: number,
  row: number,
  col: number,
  direction: FlipDirection,
): boolean {
  // Boundary checks
  if (row < 0 || row >= size || col < 0 || col >= size) {
    return false;
  }

  // Get the 2x2 plaquette vertices
  let v1: number, v2: number, v3: number, v4: number;

  if (direction === FlipDirection.Up) {
    // Check boundaries for up flip
    if (row === 0 || col === size - 1) return false;

    // Get vertices for up flip
    v1 = vertices[row * size + col]; // base
    v2 = vertices[row * size + col + 1]; // right
    v3 = vertices[(row - 1) * size + col + 1]; // upper-right
    v4 = vertices[(row - 1) * size + col]; // upper
  } else {
    // FlipDirection.Down
    // Check boundaries for down flip
    if (row === size - 1 || col === 0) return false;

    // Get vertices for down flip
    v1 = vertices[(row + 1) * size + col - 1]; // down-left
    v2 = vertices[(row + 1) * size + col]; // down
    v3 = vertices[row * size + col]; // base
    v4 = vertices[row * size + col - 1]; // left
  }

  // Check if the transformation exists
  const result = applyFlipTransformationCorrected(v1, v2, v3, v4, direction);
  return result !== null;
}

/**
 * Execute a flip on the lattice (only if valid!)
 * Modifies the vertices array in place
 */
export function executeValidFlipCorrected(
  vertices: Int8Array | Uint8Array,
  size: number,
  row: number,
  col: number,
  direction: FlipDirection,
): boolean {
  // First validate the flip
  if (!isFlipValidCorrected(vertices, size, row, col, direction)) {
    return false;
  }

  // Get the 2x2 plaquette vertices and their indices
  let v1: number, v2: number, v3: number, v4: number;
  let idx1: number, idx2: number, idx3: number, idx4: number;

  if (direction === FlipDirection.Up) {
    idx1 = row * size + col; // base
    idx2 = row * size + col + 1; // right
    idx3 = (row - 1) * size + col + 1; // upper-right
    idx4 = (row - 1) * size + col; // upper

    v1 = vertices[idx1];
    v2 = vertices[idx2];
    v3 = vertices[idx3];
    v4 = vertices[idx4];
  } else {
    // FlipDirection.Down
    idx1 = (row + 1) * size + col - 1; // down-left
    idx2 = (row + 1) * size + col; // down
    idx3 = row * size + col; // base
    idx4 = row * size + col - 1; // left

    v1 = vertices[idx1];
    v2 = vertices[idx2];
    v3 = vertices[idx3];
    v4 = vertices[idx4];
  }

  // Apply the transformation
  const result = applyFlipTransformationCorrected(v1, v2, v3, v4, direction);

  if (result === null) {
    console.error('Flip validation passed but transformation failed!');
    return false;
  }

  // Update ALL 4 vertices atomically
  vertices[idx1] = result.new1;
  vertices[idx2] = result.new2;
  vertices[idx3] = result.new3;
  vertices[idx4] = result.new4;

  return true;
}

/**
 * Validate that the entire lattice maintains the ice rule
 * and that adjacent vertices have compatible edges
 */
export function validateLatticeIntegrity(
  vertices: Int8Array | Uint8Array,
  size: number,
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check each vertex
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      const idx = row * size + col;
      const v = vertices[idx];

      // Check valid vertex type
      if (v < 0 || v > 5) {
        errors.push(`Invalid vertex type ${v} at (${row}, ${col})`);
        continue;
      }

      // Check edge compatibility with neighbors
      // Right neighbor
      if (col < size - 1) {
        const rightV = vertices[idx + 1];
        if (!checkHorizontalEdgeCompatibility(v, rightV)) {
          errors.push(
            `Incompatible horizontal edge between (${row}, ${col}) and (${row}, ${col + 1})`,
          );
        }
      }

      // Bottom neighbor
      if (row < size - 1) {
        const bottomV = vertices[(row + 1) * size + col];
        if (!checkVerticalEdgeCompatibility(v, bottomV)) {
          errors.push(
            `Incompatible vertical edge between (${row}, ${col}) and (${row + 1}, ${col})`,
          );
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Check if two horizontally adjacent vertices have compatible edges
 */
function checkHorizontalEdgeCompatibility(leftVertex: number, rightVertex: number): boolean {
  // Arrow configurations: true = IN, false = OUT
  const leftRightArrow = getVertexRightArrow(leftVertex);
  const rightLeftArrow = getVertexLeftArrow(rightVertex);

  // Edges are compatible if one points out and the other points in
  return leftRightArrow !== rightLeftArrow;
}

/**
 * Check if two vertically adjacent vertices have compatible edges
 */
function checkVerticalEdgeCompatibility(topVertex: number, bottomVertex: number): boolean {
  const topBottomArrow = getVertexBottomArrow(topVertex);
  const bottomTopArrow = getVertexTopArrow(bottomVertex);

  // Edges are compatible if one points out and the other points in
  return topBottomArrow !== bottomTopArrow;
}

// Helper functions to get arrow directions for each vertex type
function getVertexLeftArrow(v: number): boolean {
  // true = arrow points IN (toward vertex center)
  return v === VERTEX_A1 || v === VERTEX_B1 || v === VERTEX_C1;
}

function getVertexRightArrow(v: number): boolean {
  // true = arrow points IN (toward vertex center)
  return v === VERTEX_A2 || v === VERTEX_B1 || v === VERTEX_C2;
}

function getVertexTopArrow(v: number): boolean {
  // true = arrow points IN (toward vertex center)
  return v === VERTEX_A1 || v === VERTEX_B2 || v === VERTEX_C2;
}

function getVertexBottomArrow(v: number): boolean {
  // true = arrow points IN (toward vertex center)
  return v === VERTEX_A2 || v === VERTEX_B2 || v === VERTEX_C1;
}
