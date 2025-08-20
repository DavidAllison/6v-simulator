/**
 * C-style flip logic for the 6-vertex model
 * Based directly on the reference C implementation
 * 
 * This approach:
 * 1. Checks flippability based on vertex types at specific positions
 * 2. Transforms vertices using simple rules, not pattern matching
 * 3. Allows many more configurations to flip than the pattern-based approach
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
 * Check if a position can flip (C-style)
 * Based on getisflippable from main.c
 * 
 * For UP flip (high):
 * - Base position must be a1 (0) or c2 (5)
 * - Upper-right diagonal must be a2 (1) or c2 (5)
 * 
 * For DOWN flip (low):
 * - Base position must be a2 (1) or c1 (4)
 * - Lower-left diagonal must be a1 (0) or c1 (4)
 */
export function isFlipValidCStyle(
  vertices: Int8Array | Uint8Array,
  size: number,
  row: number,
  col: number,
  direction: FlipDirection
): boolean {
  // Boundary checks
  if (row < 0 || row >= size || col < 0 || col >= size) {
    return false;
  }
  
  const base = vertices[row * size + col];
  
  if (direction === FlipDirection.Up) {
    // Check boundaries for up flip
    if (row === 0 || col === size - 1) return false;
    
    // Check base position: must be a1 or c2
    if (base !== VERTEX_A1 && base !== VERTEX_C2) return false;
    
    // Check upper-right diagonal: must be a2 or c2
    const upperRight = vertices[(row - 1) * size + col + 1];
    if (upperRight !== VERTEX_A2 && upperRight !== VERTEX_C2) return false;
    
    return true;
    
  } else { // FlipDirection.Down
    // Check boundaries for down flip
    if (row === size - 1 || col === 0) return false;
    
    // Check base position: must be a1 or c1 (from C code line 1805)
    if (base !== VERTEX_A1 && base !== VERTEX_C1) return false;
    
    // Check lower-left diagonal: must be a2 or c1 (from C code line 1806-1807)
    const lowerLeft = vertices[(row + 1) * size + col - 1];
    if (lowerLeft !== VERTEX_A2 && lowerLeft !== VERTEX_C1) return false;
    
    return true;
  }
}

/**
 * Apply flip transformation (C-style)
 * Based on getweightratio and updatepositions from main.c
 * 
 * IMPORTANT: The C code uses a specific mapping where:
 * - base = current position
 * - xshift = horizontal neighbor (right for UP, left for DOWN)
 * - yshift = vertical neighbor (up for UP, down for DOWN)
 * - dshift = diagonal neighbor
 */
export function applyFlipTransformationCStyle(
  v1: number,  // base (for UP) or down-left (for DOWN)
  v2: number,  // right (for UP) or down (for DOWN)
  v3: number,  // upper-right (for UP) or base (for DOWN)
  v4: number,  // upper (for UP) or left (for DOWN)
  direction: FlipDirection
): { new1: number; new2: number; new3: number; new4: number } {
  
  let new1 = v1, new2 = v2, new3 = v3, new4 = v4;
  
  if (direction === FlipDirection.Up) {
    // UP flip transformations from the C code
    // C code mapping: base=v1, xshift=v2(right), yshift=v4(upper), dshift=v3(upper-right)
    
    // Transform base (v1)
    if (v1 === VERTEX_A1) new1 = VERTEX_C1;
    else if (v1 === VERTEX_C2) new1 = VERTEX_A2;
    
    // Transform xshift/right (v2)
    if (v2 === VERTEX_B2) new2 = VERTEX_C2;
    else if (v2 === VERTEX_C1) new2 = VERTEX_B1;
    
    // Transform dshift/upper-right (v3)
    if (v3 === VERTEX_A2) new3 = VERTEX_C1;
    else if (v3 === VERTEX_C2) new3 = VERTEX_A1;
    
    // Transform yshift/upper (v4)
    if (v4 === VERTEX_B1) new4 = VERTEX_C2;
    else if (v4 === VERTEX_C1) new4 = VERTEX_B2;
    
  } else { // FlipDirection.Down
    // DOWN flip transformations from the C code (lines 1667-1682)
    // For DOWN: base=v3, xshift=v4(left), yshift=v2(down), dshift=v1(down-left)
    
    // Transform base (v3) - lines 1668-1669
    if (v3 === VERTEX_C1) new3 = VERTEX_A2;
    else if (v3 === VERTEX_A1) new3 = VERTEX_C2;
    
    // Transform dshift/down-left (v1) - lines 1672-1673
    if (v1 === VERTEX_C1) new1 = VERTEX_A1;
    else if (v1 === VERTEX_A2) new1 = VERTEX_C2;
    
    // Transform xshift/left (v4) - lines 1676-1677
    if (v4 === VERTEX_C2) new4 = VERTEX_B1;
    else if (v4 === VERTEX_B2) new4 = VERTEX_C1;
    
    // Transform yshift/down (v2) - lines 1680-1681
    if (v2 === VERTEX_C2) new2 = VERTEX_B2;
    else if (v2 === VERTEX_B1) new2 = VERTEX_C1;
  }
  
  return { new1, new2, new3, new4 };
}

/**
 * Execute a flip using C-style logic
 */
export function executeFlipCStyle(
  vertices: Int8Array | Uint8Array,
  size: number,
  row: number,
  col: number,
  direction: FlipDirection
): boolean {
  // First check if the flip is valid
  if (!isFlipValidCStyle(vertices, size, row, col, direction)) {
    return false;
  }
  
  // Get the 2x2 plaquette vertices
  let idx1: number, idx2: number, idx3: number, idx4: number;
  
  if (direction === FlipDirection.Up) {
    idx1 = row * size + col;           // base
    idx2 = row * size + col + 1;       // right
    idx3 = (row - 1) * size + col + 1; // upper-right
    idx4 = (row - 1) * size + col;     // upper
  } else { // FlipDirection.Down
    idx1 = (row + 1) * size + col - 1; // down-left
    idx2 = (row + 1) * size + col;     // down
    idx3 = row * size + col;           // base
    idx4 = row * size + col - 1;       // left
  }
  
  // Get current vertex types
  const v1 = vertices[idx1];
  const v2 = vertices[idx2];
  const v3 = vertices[idx3];
  const v4 = vertices[idx4];
  
  // Apply transformation
  const result = applyFlipTransformationCStyle(v1, v2, v3, v4, direction);
  
  // Update vertices
  vertices[idx1] = result.new1;
  vertices[idx2] = result.new2;
  vertices[idx3] = result.new3;
  vertices[idx4] = result.new4;
  
  return true;
}

/**
 * Calculate weight ratio for a flip (C-style)
 * Based on getweightratio from main.c
 */
export function getWeightRatioCStyle(
  vertices: Int8Array | Uint8Array,
  weights: Float32Array,
  size: number,
  row: number,
  col: number,
  direction: FlipDirection
): number {
  // Check if flip is valid
  if (!isFlipValidCStyle(vertices, size, row, col, direction)) {
    return 0;
  }
  
  // Get the 2x2 plaquette vertices
  let v1: number, v2: number, v3: number, v4: number;
  
  if (direction === FlipDirection.Up) {
    v1 = vertices[row * size + col];           // base
    v2 = vertices[row * size + col + 1];       // right
    v3 = vertices[(row - 1) * size + col + 1]; // upper-right
    v4 = vertices[(row - 1) * size + col];     // upper
  } else { // FlipDirection.Down
    v1 = vertices[(row + 1) * size + col - 1]; // down-left
    v2 = vertices[(row + 1) * size + col];     // down
    v3 = vertices[row * size + col];           // base
    v4 = vertices[row * size + col - 1];       // left
  }
  
  // Calculate weight before flip
  const weightBefore = weights[v1] * weights[v2] * weights[v3] * weights[v4];
  
  // Get transformed vertices
  const result = applyFlipTransformationCStyle(v1, v2, v3, v4, direction);
  
  // Calculate weight after flip
  const weightAfter = weights[result.new1] * weights[result.new2] * 
                      weights[result.new3] * weights[result.new4];
  
  if (weightBefore === 0) return 0;
  return weightAfter / weightBefore;
}

/**
 * Validate that the lattice maintains the ice rule
 * (2 arrows in, 2 arrows out at each vertex)
 */
export function validateIceRule(
  vertices: Int8Array | Uint8Array,
  size: number
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Check each vertex
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      const idx = row * size + col;
      const type = vertices[idx];
      
      // All valid vertex types (0-5) satisfy the ice rule by definition
      if (type < 0 || type > 5) {
        errors.push(`Invalid vertex type ${type} at (${row}, ${col})`);
      }
    }
  }
  
  return { valid: errors.length === 0, errors };
}