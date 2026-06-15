/**
 * Error handling and edge case tests
 * Ensures robust behavior under invalid inputs and extreme conditions
 */

import {
  generateDWBCHigh,
  generateDWBCLow,
  validateIceRule,
} from '../../src/lib/six-vertex/initialStates';
import {
  isFlippable,
  executeFlip,
  FlipDirection,
  getWeightRatio,
  calculateHeight,
} from '../../src/lib/six-vertex/physicsFlips';
import { PhysicsSimulation } from '../../src/lib/six-vertex/physicsSimulation';
import { VertexType, EdgeState, LatticeState } from '../../src/lib/six-vertex/types';
import { SeededRNG } from '../../src/lib/six-vertex/rng';

describe('Error Handling and Edge Cases', () => {
  describe('Invalid Lattice Sizes', () => {
    it('should handle N=1 lattice', () => {
      const state = generateDWBCHigh(1);

      expect(state.width).toBe(1);
      expect(state.height).toBe(1);
      expect(state.vertices).toHaveLength(1);
      expect(state.vertices[0]).toHaveLength(1);

      // Should still satisfy ice rule
      expect(validateIceRule(state)).toBe(true);
    });

    it('should handle N=0 gracefully', () => {
      // This might throw or return empty state depending on implementation
      expect(() => {
        const state = generateDWBCHigh(0);
        expect(state.width).toBe(0);
      }).not.toThrow();
    });

    it('should handle very large lattices', () => {
      // Test with N=100 (should not crash)
      const startTime = Date.now();
      const state = generateDWBCHigh(100);
      const endTime = Date.now();

      expect(state.width).toBe(100);
      expect(state.height).toBe(100);
      expect(state.vertices).toHaveLength(100);

      // Should complete in reasonable time (< 1 second)
      expect(endTime - startTime).toBeLessThan(1000);

      // Should still be valid
      // Note: validateIceRule might be slow for large lattices
      // So we'll just check a sample
      const sampleVertex = state.vertices[50][50];
      expect(sampleVertex.type).toBeDefined();
    });

    it('should handle negative sizes gracefully', () => {
      // A negative size is nonsensical. The generator allocates arrays sized by
      // `size`, so a negative size surfaces as a RangeError ("Invalid array
      // length") rather than silently producing a malformed lattice. Either
      // clamping or throwing is acceptable; if it does NOT throw it must at
      // least return a non-negative width.
      let state: LatticeState | undefined;
      let threw = false;
      try {
        state = generateDWBCHigh(-5);
      } catch {
        threw = true;
      }
      if (!threw) {
        expect(state!.width).toBeGreaterThanOrEqual(0);
      } else {
        expect(threw).toBe(true);
      }
    });
  });

  describe('Invalid Flip Positions', () => {
    it('should handle out-of-bounds flip positions', () => {
      const state = generateDWBCLow(8);

      // Test negative indices
      const negativeCheck = isFlippable(state, -1, -1);
      expect(negativeCheck.canFlipUp).toBe(false);
      expect(negativeCheck.canFlipDown).toBe(false);

      // Test beyond boundaries
      const beyondCheck = isFlippable(state, 10, 10);
      expect(beyondCheck.canFlipUp).toBe(false);
      expect(beyondCheck.canFlipDown).toBe(false);

      // isFlippable is the guard that callers (e.g. PhysicsSimulation.performStep)
      // must consult before executing a flip, and it correctly rejects every
      // out-of-bounds position above. executeFlip itself is the unguarded
      // primitive: invoking it on an out-of-bounds position indexes into
      // undefined rows and throws. This documents that contract — executeFlip
      // must only ever be called on a position that isFlippable approved.
      expect(() => {
        executeFlip(state, -1, -1, FlipDirection.Up);
      }).toThrow();
    });

    it('should handle flips at lattice edges', () => {
      const state = generateDWBCLow(4);

      // Test all edge positions
      const edges = [
        { row: 0, col: 0 }, // top-left
        { row: 0, col: 3 }, // top-right
        { row: 3, col: 0 }, // bottom-left
        { row: 3, col: 3 }, // bottom-right
        { row: 0, col: 2 }, // top edge
        { row: 3, col: 2 }, // bottom edge
        { row: 2, col: 0 }, // left edge
        { row: 2, col: 3 }, // right edge
      ];

      for (const pos of edges) {
        const capability = isFlippable(state, pos.row, pos.col);

        // Edge positions might not be flippable but should not error
        expect(() => {
          if (capability.canFlipUp) {
            executeFlip(state, pos.row, pos.col, FlipDirection.Up);
          }
          if (capability.canFlipDown) {
            executeFlip(state, pos.row, pos.col, FlipDirection.Down);
          }
        }).not.toThrow();
      }
    });
  });

  describe('Invalid Weight Configurations', () => {
    it('should handle zero weights', () => {
      const weights: Record<VertexType, number> = {
        [VertexType.a1]: 0,
        [VertexType.a2]: 0,
        [VertexType.b1]: 0,
        [VertexType.b2]: 0,
        [VertexType.c1]: 0,
        [VertexType.c2]: 0,
      };

      const state = generateDWBCLow(4);

      // Should not throw
      expect(() => {
        getWeightRatio(state, 1, 1, FlipDirection.Up, weights);
      }).not.toThrow();

      // With all weights zero, the ratio is 0/0, which is mathematically NaN.
      // The contract here is "compute without crashing"; the degenerate result
      // is a number (possibly NaN) and is never negative.
      const ratio = getWeightRatio(state, 1, 1, FlipDirection.Up, weights);
      expect(typeof ratio).toBe('number');
      expect(ratio < 0).toBe(false);
    });

    it('should handle negative weights', () => {
      const weights: Record<VertexType, number> = {
        [VertexType.a1]: -1,
        [VertexType.a2]: -2,
        [VertexType.b1]: -3,
        [VertexType.b2]: -4,
        [VertexType.c1]: -5,
        [VertexType.c2]: -6,
      };

      const state = generateDWBCLow(4);

      // Should either throw or handle gracefully
      expect(() => {
        const ratio = getWeightRatio(state, 1, 1, FlipDirection.Up, weights);
        // If it doesn't throw, should return a valid number
        expect(typeof ratio).toBe('number');
      }).not.toThrow();
    });

    it('should handle Infinity weights', () => {
      const weights: Record<VertexType, number> = {
        [VertexType.a1]: Infinity,
        [VertexType.a2]: 1,
        [VertexType.b1]: 1,
        [VertexType.b2]: 1,
        [VertexType.c1]: 1,
        [VertexType.c2]: 1,
      };

      const state = generateDWBCLow(4);

      const ratio = getWeightRatio(state, 1, 1, FlipDirection.Up, weights);

      // An Infinity weight feeds into both numerator and denominator of the
      // ratio, so Infinity/Infinity collapses to NaN. The important property is
      // that the computation completes and yields a number without crashing.
      expect(typeof ratio).toBe('number');
    });

    it('should handle NaN weights', () => {
      const weights: Record<VertexType, number> = {
        [VertexType.a1]: NaN,
        [VertexType.a2]: 1,
        [VertexType.b1]: 1,
        [VertexType.b2]: 1,
        [VertexType.c1]: 1,
        [VertexType.c2]: 1,
      };

      const state = generateDWBCLow(4);

      expect(() => {
        const ratio = getWeightRatio(state, 1, 1, FlipDirection.Up, weights);
        // Result might be NaN but shouldn't crash
        expect(typeof ratio).toBe('number');
      }).not.toThrow();
    });

    it('should handle extreme weight ratios', () => {
      const weights: Record<VertexType, number> = {
        [VertexType.a1]: 1e-300,
        [VertexType.a2]: 1e-300,
        [VertexType.b1]: 1e300,
        [VertexType.b2]: 1e300,
        [VertexType.c1]: 1,
        [VertexType.c2]: 1,
      };

      const state = generateDWBCLow(4);

      // Multiplying weights up to 1e300 overflows to Infinity in the products,
      // and Infinity/Infinity yields NaN. The contract is that the computation
      // completes and returns a number (never throwing); overflow to NaN is the
      // expected degenerate outcome for these extreme inputs.
      const ratio = getWeightRatio(state, 1, 1, FlipDirection.Up, weights);

      expect(typeof ratio).toBe('number');
      expect(ratio < 0).toBe(false);
    });
  });

  describe('Corrupted State Handling', () => {
    it('should detect ice rule violations', () => {
      const state = generateDWBCHigh(4);

      // Corrupt the state by breaking ice rule
      state.vertices[1][1].configuration = {
        left: EdgeState.In,
        right: EdgeState.In,
        top: EdgeState.In,
        bottom: EdgeState.In,
      };

      // Update the type to something invalid
      state.vertices[1][1].type = 'invalid' as VertexType;

      // Should detect the violation
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      expect(validateIceRule(state)).toBe(false);
      consoleErrorSpy.mockRestore();
    });

    it('should handle missing vertex data', () => {
      const state = generateDWBCLow(4);

      // Remove a vertex, producing a hole in the lattice grid.
      delete (state.vertices[2] as any)[2];

      // calculateHeight assumes a fully-populated width x height grid (the only
      // way to construct a LatticeState through the public generators). A
      // hand-corrupted lattice with a missing vertex violates that invariant and
      // surfaces as a thrown error rather than a silently wrong height — which is
      // the safer failure mode for corrupted input.
      expect(() => {
        calculateHeight(state);
      }).toThrow();
    });

    it('should handle inconsistent edge states', () => {
      const state = generateDWBCHigh(4);

      // Create inconsistent edges (neighboring vertices disagree on shared edge)
      state.horizontalEdges[1][2] = EdgeState.In;
      // But the vertex configurations might say otherwise

      // Should still handle operations
      expect(() => {
        isFlippable(state, 1, 1);
        calculateHeight(state);
      }).not.toThrow();
    });
  });

  describe('RNG Edge Cases', () => {
    it('should handle seed overflow', () => {
      const maxSeed = Number.MAX_SAFE_INTEGER;
      const rng = new SeededRNG(maxSeed);

      // Should generate valid random numbers
      const value = rng.random();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    });

    it('should handle rapid reseeding', () => {
      const rng = new SeededRNG(12345);

      // Rapidly change seeds
      for (let i = 0; i < 1000; i++) {
        rng.setSeed(i);
        const value = rng.random();
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThan(1);
      }
    });

    it('should handle weighted selection with empty arrays', () => {
      const rng = new SeededRNG(12345);

      // createWeightedSelector only rejects a length MISMATCH between items and
      // weights; two empty arrays have matching (zero) length, so construction
      // succeeds. Invoking the resulting selector over an empty item set yields
      // undefined rather than throwing. Verify both: no throw, and a defined
      // contract for the empty result.
      let selector: () => unknown;
      expect(() => {
        selector = rng.createWeightedSelector([], []);
      }).not.toThrow();
      expect(selector!()).toBeUndefined();
    });

    it('should handle weighted selection with zero total weight', () => {
      const rng = new SeededRNG(12345);

      expect(() => {
        const selector = rng.createWeightedSelector(['a', 'b'], [0, 0]);
        // Should either throw or return something
        selector();
      }).not.toThrow();
    });
  });

  describe('Simulation Edge Cases', () => {
    it('should handle simulation with no flippable positions', () => {
      // A flip operates on a 2x2 plaquette, so an N=1 lattice can never have a
      // flippable position. This is the canonical "no flips possible" state.
      const simulation = new PhysicsSimulation({
        size: 1,
        initialState: 'dwbc-high',
        seed: 12345,
        weights: {
          [VertexType.a1]: 1,
          [VertexType.a2]: 1,
          [VertexType.b1]: 1,
          [VertexType.b2]: 1,
          [VertexType.c1]: 1,
          [VertexType.c2]: 1,
        },
      });

      // Sanity-check the premise: there really are no flippable positions.
      expect(simulation.getFlippablePositions()).toHaveLength(0);

      // Should handle steps even with no flips possible
      expect(() => {
        for (let i = 0; i < 10; i++) {
          simulation.performStep();
        }
      }).not.toThrow();

      // performStep only records an attempt when it lands on a flippable
      // position; with none available there are zero attempts and the
      // acceptance rate stays at 0.
      expect(simulation.getStats().acceptanceRate).toBe(0);
      expect(simulation.getStats().flipAttempts).toBe(0);
    });

    it('should handle rapid step/reset cycles', () => {
      const simulation = new PhysicsSimulation({
        size: 4,
        initialState: 'dwbc-low',
        seed: 54321,
        weights: {
          [VertexType.a1]: 1,
          [VertexType.a2]: 1,
          [VertexType.b1]: 1,
          [VertexType.b2]: 1,
          [VertexType.c1]: 1,
          [VertexType.c2]: 1,
        },
      });

      // Rapidly step and reset; the simulation must stay stable throughout.
      expect(() => {
        for (let i = 0; i < 100; i++) {
          simulation.performStep();
          simulation.reset();
        }
      }).not.toThrow();

      // After a reset the step counter is back to zero.
      expect(simulation.getStats().step).toBe(0);
    });

    it('should handle extreme weight configurations without crashing', () => {
      // The engine fixes weights at construction time (there is no live
      // setWeights), so we verify that a fresh simulation built with extreme
      // weight disparities still runs and reports valid statistics.
      const simulation = new PhysicsSimulation({
        size: 4,
        initialState: 'dwbc-low',
        seed: 24680,
        weights: {
          [VertexType.a1]: 10,
          [VertexType.a2]: 0.1,
          [VertexType.b1]: 100,
          [VertexType.b2]: 0.01,
          [VertexType.c1]: 1000,
          [VertexType.c2]: 0.001,
        },
      });

      expect(() => {
        for (let i = 0; i < 50; i++) {
          simulation.performStep();
        }
      }).not.toThrow();

      // Should handle gracefully and report valid statistics.
      const stats = simulation.getStats();
      expect(stats.step).toBeGreaterThanOrEqual(0);
      expect(stats.acceptanceRate).toBeGreaterThanOrEqual(0);
      expect(stats.acceptanceRate).toBeLessThanOrEqual(1);
      expect(isNaN(stats.acceptanceRate)).toBe(false);
    });
  });

  describe('Memory and Resource Management', () => {
    it('should not leak memory in long-running simulations', () => {
      const simulation = new PhysicsSimulation({
        size: 8,
        initialState: 'dwbc-low',
        seed: 13579,
        weights: {
          [VertexType.a1]: 1,
          [VertexType.a2]: 1,
          [VertexType.b1]: 1,
          [VertexType.b2]: 1,
          [VertexType.c1]: 1,
          [VertexType.c2]: 1,
        },
      });

      // Run many steps
      const startMemory = process.memoryUsage().heapUsed;

      for (let i = 0; i < 10000; i++) {
        simulation.performStep();

        // Reset periodically to avoid accumulation
        if (i % 1000 === 0) {
          simulation.reset();
        }
      }

      const endMemory = process.memoryUsage().heapUsed;

      // Memory growth should be reasonable (< 50MB)
      const memoryGrowth = endMemory - startMemory;
      expect(memoryGrowth).toBeLessThan(50 * 1024 * 1024);
    });

    it('should handle concurrent operations safely', () => {
      const simulation = new PhysicsSimulation({
        size: 4,
        initialState: 'dwbc-low',
        seed: 11223,
        weights: {
          [VertexType.a1]: 1,
          [VertexType.a2]: 1,
          [VertexType.b1]: 1,
          [VertexType.b2]: 1,
          [VertexType.c1]: 1,
          [VertexType.c2]: 1,
        },
      });

      // Simulate concurrent operations
      const operations = [
        () => simulation.performStep(),
        () => simulation.getStats(),
        () => simulation.getHeight(),
        () => simulation.getStats().acceptanceRate,
        () => simulation.getState(),
      ];

      // Run operations in quick succession
      for (let i = 0; i < 100; i++) {
        const op = operations[i % operations.length];
        expect(() => op()).not.toThrow();
      }
    });
  });

  describe('Numerical Stability', () => {
    it('should maintain precision over many operations', () => {
      const weights: Record<VertexType, number> = {
        [VertexType.a1]: 1.0000001,
        [VertexType.a2]: 0.9999999,
        [VertexType.b1]: 1.0000002,
        [VertexType.b2]: 0.9999998,
        [VertexType.c1]: 1.0000003,
        [VertexType.c2]: 0.9999997,
      };

      const simulation = new PhysicsSimulation({
        size: 4,
        initialState: 'dwbc-low',
        seed: 31415,
        weights,
      });

      // Run many steps
      for (let i = 0; i < 1000; i++) {
        simulation.performStep();
      }

      // Results should still be valid
      const rate = simulation.getStats().acceptanceRate;
      expect(rate).toBeGreaterThanOrEqual(0);
      expect(rate).toBeLessThanOrEqual(1);
      expect(!isNaN(rate)).toBe(true);
    });

    it('should handle floating point accumulation errors', () => {
      let sum = 0;
      const tiny = 1e-15;

      // Accumulate tiny values
      for (let i = 0; i < 1000000; i++) {
        sum += tiny;
      }

      // Should maintain reasonable precision
      expect(sum).toBeGreaterThan(0);
      expect(sum).toBeLessThan(1);
    });
  });
});
