/**
 * Test suite to verify ice rule preservation during flips
 * The ice rule states that each vertex must have exactly 2 arrows in and 2 arrows out
 */

import { describe, it, expect } from '@jest/globals';
import {
  OptimizedSimulation,
  generateDWBCHighOptimized,
  generateDWBCLowOptimized,
} from '../../src/lib/six-vertex/optimizedSimulation';
import { VertexType, getVertexConfiguration } from '../../src/lib/six-vertex/types';

// Map numeric vertex types to enum
const NUM_TO_VERTEX_TYPE = [
  VertexType.a1,
  VertexType.a2,
  VertexType.b1,
  VertexType.b2,
  VertexType.c1,
  VertexType.c2,
];

/**
 * Check if a vertex satisfies the ice rule
 */
function checkIceRule(vertexType: VertexType): boolean {
  const config = getVertexConfiguration(vertexType);

  // Config should always be defined for valid vertex types
  if (!config) {
    console.error('Invalid vertex type:', vertexType);
    return false;
  }

  let ins = 0;
  let outs = 0;

  if (config.left === 'in') ins++;
  else outs++;
  if (config.right === 'in') ins++;
  else outs++;
  if (config.top === 'in') ins++;
  else outs++;
  if (config.bottom === 'in') ins++;
  else outs++;

  return ins === 2 && outs === 2;
}

/**
 * Validate ice rule for entire lattice
 */
function validateLatticeIceRule(
  state: Uint8Array | Int8Array,
  size: number,
): { valid: boolean; violations: string[] } {
  const violations: string[] = [];

  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      const idx = row * size + col;
      const vertexType = NUM_TO_VERTEX_TYPE[state[idx]];

      if (!checkIceRule(vertexType)) {
        violations.push(`(${row},${col}): ${vertexType}`);
      }
    }
  }

  return {
    valid: violations.length === 0,
    violations,
  };
}

describe('Ice Rule Validation', () => {
  describe('Initial DWBC configurations', () => {
    it('should have valid ice rule for DWBC High initial state', () => {
      const sizes = [4, 5, 6, 8, 12];

      for (const size of sizes) {
        const state = generateDWBCHighOptimized(size);
        const validation = validateLatticeIceRule(state, size);

        expect(validation.valid).toBe(true);
        expect(validation.violations).toHaveLength(0);
      }
    });

    it('should have valid ice rule for DWBC Low initial state', () => {
      const sizes = [4, 5, 6, 8, 12];

      for (const size of sizes) {
        const state = generateDWBCLowOptimized(size);
        const validation = validateLatticeIceRule(state, size);

        expect(validation.valid).toBe(true);
        expect(validation.violations).toHaveLength(0);
      }
    });
  });

  describe('Ice rule preservation during flips', () => {
    it('should maintain ice rule after single flips', () => {
      const size = 6;
      const sim = new OptimizedSimulation({
        size,
        weights: {
          a1: 1,
          a2: 1,
          b1: 1,
          b2: 1,
          c1: 1,
          c2: 1,
        },
        beta: 0.5,
        seed: 12345,
      });

      // Start with DWBC High
      const initialState = generateDWBCHighOptimized(size);
      sim.setState(initialState);

      // Verify initial state
      let validation = validateLatticeIceRule(sim.getRawState(), size);
      expect(validation.valid).toBe(true);

      // Perform multiple single steps and verify ice rule after each
      for (let i = 0; i < 50; i++) {
        const stateBefore = new Uint8Array(sim.getRawState());
        sim.step();
        const stateAfter = sim.getRawState();

        validation = validateLatticeIceRule(stateAfter, size);

        if (!validation.valid) {
          console.error(`Ice rule violation after flip ${i + 1}`);
          console.error('Violations:', validation.violations);

          // Find what changed
          for (let idx = 0; idx < stateBefore.length; idx++) {
            if (stateBefore[idx] !== stateAfter[idx]) {
              const row = Math.floor(idx / size);
              const col = idx % size;
              console.error(
                `Changed: (${row},${col}) from ${NUM_TO_VERTEX_TYPE[stateBefore[idx]]} to ${NUM_TO_VERTEX_TYPE[stateAfter[idx]]}`,
              );
            }
          }
        }

        expect(validation.valid).toBe(true);
        expect(validation.violations).toHaveLength(0);
      }
    });

    it('should maintain ice rule during extended simulation', () => {
      const size = 8;
      const sim = new OptimizedSimulation({
        size,
        weights: {
          a1: 1,
          a2: 1,
          b1: 1,
          b2: 1,
          c1: 1,
          c2: 1,
        },
        beta: 0.5,
        seed: 54321,
      });

      // Start with DWBC Low
      const initialState = generateDWBCLowOptimized(size);
      sim.setState(initialState);

      // Run for many steps
      sim.run(1000);

      // Verify ice rule after extended simulation
      const validation = validateLatticeIceRule(sim.getRawState(), size);
      expect(validation.valid).toBe(true);
      expect(validation.violations).toHaveLength(0);
    });

    it('should maintain ice rule with different weight configurations', () => {
      const weightConfigs = [
        { a1: 1, a2: 1, b1: 1, b2: 1, c1: 1, c2: 1 }, // Uniform
        { a1: 2, a2: 2, b1: 1, b2: 1, c1: 1, c2: 1 }, // A-biased
        { a1: 1, a2: 1, b1: 2, b2: 2, c1: 1, c2: 1 }, // B-biased
        { a1: 1, a2: 1, b1: 1, b2: 1, c1: 2, c2: 2 }, // C-biased
      ];

      for (const weights of weightConfigs) {
        const sim = new OptimizedSimulation({
          size: 6,
          weights,
          beta: 0.5,
          seed: 99999,
        });

        const initialState = generateDWBCHighOptimized(6);
        sim.setState(initialState);

        // Run simulation
        sim.run(500);

        // Verify ice rule
        const validation = validateLatticeIceRule(sim.getRawState(), 6);
        expect(validation.valid).toBe(true);
        expect(validation.violations).toHaveLength(0);
      }
    });
  });

  describe('Edge case handling', () => {
    it('should maintain ice rule at lattice boundaries', () => {
      const size = 5;
      const sim = new OptimizedSimulation({
        size,
        weights: {
          a1: 1,
          a2: 1,
          b1: 1,
          b2: 1,
          c1: 1,
          c2: 1,
        },
        beta: 0.5,
        seed: 11111,
      });

      const initialState = generateDWBCHighOptimized(size);
      sim.setState(initialState);

      // Run simulation
      sim.run(200);

      const state = sim.getRawState();

      // Check edge vertices specifically
      const edgePositions = [
        // Top edge
        ...Array.from({ length: size }, (_, col) => ({ row: 0, col })),
        // Bottom edge
        ...Array.from({ length: size }, (_, col) => ({ row: size - 1, col })),
        // Left edge (excluding corners)
        ...Array.from({ length: size - 2 }, (_, i) => ({ row: i + 1, col: 0 })),
        // Right edge (excluding corners)
        ...Array.from({ length: size - 2 }, (_, i) => ({ row: i + 1, col: size - 1 })),
      ];

      for (const { row, col } of edgePositions) {
        const idx = row * size + col;
        const vertexType = NUM_TO_VERTEX_TYPE[state[idx]];
        const isValid = checkIceRule(vertexType);

        if (!isValid) {
          console.error(`Edge vertex (${row},${col}) violates ice rule: ${vertexType}`);
        }

        expect(isValid).toBe(true);
      }
    });
  });
});
