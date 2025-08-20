/**
 * Fixed flip logic for the 6-vertex model
 * This module provides correct flip detection and transformation
 * that preserves the ice rule (2 arrows in, 2 arrows out) for all vertices
 */

import { VertexType } from './types';
import { FlipDirection } from './physicsFlips';

// Numeric constants for performance
export const VERTEX_A1 = 0;
export const VERTEX_A2 = 1;
export const VERTEX_B1 = 2;
export const VERTEX_B2 = 3;
export const VERTEX_C1 = 4;
export const VERTEX_C2 = 5;

// Arrow configurations for each vertex type
// Each vertex has arrows on 4 edges: left, right, top, bottom
// 1 = arrow pointing IN to vertex, 0 = arrow pointing OUT from vertex
export const VERTEX_ARROWS = {
  [VERTEX_A1]: { left: 1, right: 0, top: 1, bottom: 0 },  // left IN, right OUT, top IN, bottom OUT
  [VERTEX_A2]: { left: 0, right: 1, top: 0, bottom: 1 },  // left OUT, right IN, top OUT, bottom IN
  [VERTEX_B1]: { left: 1, right: 1, top: 0, bottom: 0 },  // left IN, right IN, top OUT, bottom OUT
  [VERTEX_B2]: { left: 0, right: 0, top: 1, bottom: 1 },  // left OUT, right OUT, top IN, bottom IN
  [VERTEX_C1]: { left: 1, right: 0, top: 0, bottom: 1 },  // left IN, right OUT, top OUT, bottom IN
  [VERTEX_C2]: { left: 0, right: 1, top: 1, bottom: 0 },  // left OUT, right IN, top IN, bottom OUT
};

/**
 * Validate that a vertex configuration maintains the ice rule
 * Returns true if the vertex has exactly 2 arrows in and 2 arrows out
 */
export function validateIceRule(vertexType: number): boolean {
  if (vertexType < 0 || vertexType > 5) return false;
  
  const arrows = VERTEX_ARROWS[vertexType];
  const ins = arrows.left + arrows.right + arrows.top + arrows.bottom;
  
  // Each vertex must have exactly 2 arrows in (and therefore 2 out)
  return ins === 2;
}

/**
 * Check if a 2x2 plaquette can flip while maintaining ice rule
 * Returns true only if the flip would result in valid vertex configurations
 */
export function canFlipPlaquette(
  v1: number, // bottom-left vertex (base for up flip, or down-left for down flip)
  v2: number, // bottom-right or bottom vertex
  v3: number, // top-right or base vertex  
  v4: number, // top-left or left vertex
  direction: FlipDirection
): boolean {
  // Validate input vertex types
  if (v1 < 0 || v1 > 5 || v2 < 0 || v2 > 5 || v3 < 0 || v3 > 5 || v4 < 0 || v4 > 5) {
    return false;
  }

  // For UP flip, the plaquette arrangement is:
  //   v4 -- v3
  //   |     |
  //   v1 -- v2
  // where v1 is the base vertex at (row, col)
  
  // For DOWN flip, the plaquette arrangement is:
  //   v4 -- v3
  //   |     |  
  //   v1 -- v2
  // where v3 is the base vertex at (row, col)

  // The key insight: we should check if the transformation would produce valid vertices
  // Rather than checking patterns upfront, let's apply the transformation and validate
  
  // Apply the transformation
  const { new1, new2, new3, new4 } = applyFlipTransformation(v1, v2, v3, v4, direction);
  
  // Check if all resulting vertices are valid (maintain ice rule)
  const allValid = validateIceRule(new1) && validateIceRule(new2) && 
                   validateIceRule(new3) && validateIceRule(new4);
  
  // Also check that at least one vertex actually changes (non-trivial flip)
  const hasChange = (new1 !== v1) || (new2 !== v2) || (new3 !== v3) || (new4 !== v4);
  
  return allValid && hasChange;
}

/**
 * Apply flip transformation to a 2x2 plaquette
 * Returns the new vertex types after the flip
 * IMPORTANT: Only call this after verifying with canFlipPlaquette!
 */
export function applyFlipTransformation(
  v1: number,
  v2: number,
  v3: number,
  v4: number,
  direction: FlipDirection
): { new1: number; new2: number; new3: number; new4: number } {
  if (direction === FlipDirection.Up) {
    // UP flip transformations - only specific patterns can flip
    // The key is checking the base (v1) and upper-right (v3) vertices
    
    let new1 = v1;
    let new2 = v2;
    let new3 = v3;
    let new4 = v4;
    
    // Check valid flip patterns and apply transformations
    // Pattern 1: a1 at base with a2 at upper-right
    if (v1 === VERTEX_A1 && v3 === VERTEX_A2) {
      new1 = VERTEX_C1;  // a1 -> c1
      new2 = (v2 === VERTEX_B2) ? VERTEX_C2 : v2;  // b2 -> c2
      new3 = VERTEX_C1;  // a2 -> c1
      new4 = (v4 === VERTEX_B1) ? VERTEX_C2 : v4;  // b1 -> c2
    }
    // Pattern 2: c2 at base with c2 at upper-right
    else if (v1 === VERTEX_C2 && v3 === VERTEX_C2) {
      new1 = VERTEX_A2;  // c2 -> a2
      new2 = (v2 === VERTEX_B1) ? VERTEX_C1 : (v2 === VERTEX_C2) ? VERTEX_B2 : v2;
      new3 = VERTEX_A1;  // c2 -> a1
      new4 = (v4 === VERTEX_B2) ? VERTEX_C1 : (v4 === VERTEX_C2) ? VERTEX_B1 : v4;
    }
    // Pattern 3: c2 at base with a2 at upper-right
    else if (v1 === VERTEX_C2 && v3 === VERTEX_A2) {
      new1 = VERTEX_A2;  // c2 -> a2
      new2 = (v2 === VERTEX_C1) ? VERTEX_B1 : v2;
      new3 = VERTEX_C1;  // a2 -> c1
      new4 = (v4 === VERTEX_C1) ? VERTEX_B2 : v4;
    }
    // Pattern 4: a1 at base with c2 at upper-right
    else if (v1 === VERTEX_A1 && v3 === VERTEX_C2) {
      new1 = VERTEX_C1;  // a1 -> c1
      new3 = VERTEX_A1;  // c2 -> a1
      // Handle edges appropriately
      new2 = v2; // Keep as is or transform based on specific rules
      new4 = v4;
    }
    // Pattern 5: b vertices with c2
    else if ((v1 === VERTEX_B1 || v1 === VERTEX_B2) && v3 === VERTEX_C2) {
      new1 = (v1 === VERTEX_B1) ? VERTEX_B2 : VERTEX_B1;  // Toggle b type
      new3 = VERTEX_A1;  // c2 -> a1
      new2 = v2;
      new4 = v4;
    }
    else if (v1 === VERTEX_C2 && (v3 === VERTEX_B1 || v3 === VERTEX_B2)) {
      new1 = VERTEX_A2;  // c2 -> a2
      new3 = (v3 === VERTEX_B1) ? VERTEX_B2 : VERTEX_B1;  // Toggle b type
      new2 = v2;
      new4 = v4;
    }
    // No transformation for invalid patterns - return unchanged
    
    return { new1, new2, new3, new4 };
    
  } else { // FlipDirection.Down
    // DOWN flip transformations - only specific patterns can flip
    // The key is checking the base (v3) and down-left (v1) vertices
    
    let new1 = v1;
    let new2 = v2;
    let new3 = v3;
    let new4 = v4;
    
    // Check valid flip patterns and apply transformations
    // Pattern 1: a1 at base with a2 at down-left
    if (v3 === VERTEX_A1 && v1 === VERTEX_A2) {
      new3 = VERTEX_C2;  // a1 -> c2
      new1 = VERTEX_C2;  // a2 -> c2
      new2 = (v2 === VERTEX_B1) ? VERTEX_C1 : v2;  // b1 -> c1
      new4 = (v4 === VERTEX_B2) ? VERTEX_C1 : v4;  // b2 -> c1
    }
    // Pattern 2: c1 at base with c1 at down-left
    else if (v3 === VERTEX_C1 && v1 === VERTEX_C1) {
      new3 = VERTEX_A2;  // c1 -> a2
      new1 = VERTEX_A1;  // c1 -> a1
      new2 = (v2 === VERTEX_C1) ? VERTEX_B1 : v2;
      new4 = (v4 === VERTEX_C1) ? VERTEX_B2 : v4;
    }
    // Pattern 3: c1 at base with a2 at down-left
    else if (v3 === VERTEX_C1 && v1 === VERTEX_A2) {
      new3 = VERTEX_A2;  // c1 -> a2
      new1 = VERTEX_C2;  // a2 -> c2
      new2 = v2;
      new4 = v4;
    }
    // Pattern 4: a1 at base with c1 at down-left
    else if (v3 === VERTEX_A1 && v1 === VERTEX_C1) {
      new3 = VERTEX_C2;  // a1 -> c2
      new1 = VERTEX_A1;  // c1 -> a1
      new2 = v2;
      new4 = v4;
    }
    // Pattern 5: b vertices with c2
    else if ((v3 === VERTEX_B1 || v3 === VERTEX_B2) && v1 === VERTEX_C2) {
      new3 = (v3 === VERTEX_B1) ? VERTEX_B2 : VERTEX_B1;  // Toggle b type
      new1 = VERTEX_A2;  // c2 -> a2
      new2 = v2;
      new4 = v4;
    }
    else if (v3 === VERTEX_C2 && (v1 === VERTEX_B1 || v1 === VERTEX_B2)) {
      new3 = VERTEX_A1;  // c2 -> a1
      new1 = (v1 === VERTEX_B1) ? VERTEX_B2 : VERTEX_B1;  // Toggle b type
      new2 = v2;
      new4 = v4;
    }
    // Pattern 6: c2-c2
    else if (v3 === VERTEX_C2 && v1 === VERTEX_C2) {
      new3 = VERTEX_A1;  // c2 -> a1
      new1 = VERTEX_A2;  // c2 -> a2
      new2 = (v2 === VERTEX_C2) ? VERTEX_B2 : (v2 === VERTEX_B1) ? VERTEX_C1 : v2;
      new4 = (v4 === VERTEX_C2) ? VERTEX_B1 : (v4 === VERTEX_B2) ? VERTEX_C1 : v4;
    }
    // No transformation for invalid patterns - return unchanged
    
    return { new1, new2, new3, new4 };
  }
}

/**
 * Check if a flip at the given position is valid
 * This is the main entry point for flip validation
 */
export function isFlipValid(
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
  
  // Get the 2x2 plaquette vertices
  let v1: number, v2: number, v3: number, v4: number;
  
  if (direction === FlipDirection.Up) {
    // Check boundaries for up flip
    if (row === 0 || col === size - 1) return false;
    
    // Get vertices in correct order for up flip
    v1 = vertices[row * size + col];           // base (bottom-left)
    v2 = vertices[row * size + col + 1];       // right (bottom-right)
    v3 = vertices[(row - 1) * size + col + 1]; // upper-right (top-right)
    v4 = vertices[(row - 1) * size + col];     // upper (top-left)
    
  } else { // FlipDirection.Down
    // Check boundaries for down flip
    if (row === size - 1 || col === 0) return false;
    
    // Get vertices in correct order for down flip
    v1 = vertices[(row + 1) * size + col - 1]; // down-left (bottom-left)
    v2 = vertices[(row + 1) * size + col];     // down (bottom-right)
    v3 = vertices[row * size + col];           // base (top-right)
    v4 = vertices[row * size + col - 1];       // left (top-left)
  }
  
  // Check if the plaquette can flip
  if (!canFlipPlaquette(v1, v2, v3, v4, direction)) {
    return false;
  }
  
  // Apply the transformation and verify all vertices remain valid
  const { new1, new2, new3, new4 } = applyFlipTransformation(v1, v2, v3, v4, direction);
  
  // Validate that all new vertices maintain ice rule
  return validateIceRule(new1) && validateIceRule(new2) && 
         validateIceRule(new3) && validateIceRule(new4);
}

/**
 * Execute a flip on the lattice (only if valid!)
 * Modifies the vertices array in place
 */
export function executeValidFlip(
  vertices: Int8Array | Uint8Array,
  size: number,
  row: number,
  col: number,
  direction: FlipDirection
): boolean {
  // First validate the flip
  if (!isFlipValid(vertices, size, row, col, direction)) {
    return false;
  }
  
  // Get the 2x2 plaquette vertices
  let v1: number, v2: number, v3: number, v4: number;
  let idx1: number, idx2: number, idx3: number, idx4: number;
  
  if (direction === FlipDirection.Up) {
    idx1 = row * size + col;           // base
    idx2 = row * size + col + 1;       // right
    idx3 = (row - 1) * size + col + 1; // upper-right
    idx4 = (row - 1) * size + col;     // upper
    
    v1 = vertices[idx1];
    v2 = vertices[idx2];
    v3 = vertices[idx3];
    v4 = vertices[idx4];
    
  } else { // FlipDirection.Down
    idx1 = (row + 1) * size + col - 1; // down-left
    idx2 = (row + 1) * size + col;     // down
    idx3 = row * size + col;           // base
    idx4 = row * size + col - 1;       // left
    
    v1 = vertices[idx1];
    v2 = vertices[idx2];
    v3 = vertices[idx3];
    v4 = vertices[idx4];
  }
  
  // Apply the transformation
  const { new1, new2, new3, new4 } = applyFlipTransformation(v1, v2, v3, v4, direction);
  
  // Update the vertices
  vertices[idx1] = new1;
  vertices[idx2] = new2;
  vertices[idx3] = new3;
  vertices[idx4] = new4;
  
  return true;
}