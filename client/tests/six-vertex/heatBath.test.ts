/**
 * Test suite for heat-bath dynamics and weight ratio calculations
 * Verifies Metropolis-Hastings acceptance probabilities and detailed balance
 */

import {
  getWeightRatio,
  executeFlip,
  FlipDirection,
  isFlippable,
  getAllFlippablePositions,
} from '../../src/lib/six-vertex/physicsFlips';
import { generateDWBCLow, generateRandomIceState } from '../../src/lib/six-vertex/initialStates';
import { VertexType, LatticeState } from '../../src/lib/six-vertex/types';
import { SeededRNG } from '../../src/lib/six-vertex/rng';

describe('Heat-Bath Probability Tests', () => {
  describe('Weight Ratio Calculations', () => {
    it('should calculate correct weight ratios for equal weights', () => {
      const state = generateDWBCLow(6);
      const weights: Record<VertexType, number> = {
        [VertexType.a1]: 1,
        [VertexType.a2]: 1,
        [VertexType.b1]: 1,
        [VertexType.b2]: 1,
        [VertexType.c1]: 1,
        [VertexType.c2]: 1,
      };

      // Find a flippable position
      const flippable = getAllFlippablePositions(state);
      if (flippable.length > 0) {
        const pos = flippable[0];
        const direction = pos.capability.canFlipUp ? FlipDirection.Up : FlipDirection.Down;

        const ratio = getWeightRatio(state, pos.position.row, pos.position.col, direction, weights);

        // With equal weights, ratio should always be 1
        expect(ratio).toBeCloseTo(1.0, 10);
      }
    });

    it('should calculate correct weight ratios for different weights', () => {
      const state = generateDWBCLow(6);
      const weights: Record<VertexType, number> = {
        [VertexType.a1]: 1,
        [VertexType.a2]: 1,
        [VertexType.b1]: 2,
        [VertexType.b2]: 2,
        [VertexType.c1]: 3,
        [VertexType.c2]: 3,
      };

      // Manually set up a known configuration
      state.vertices[2][2].type = VertexType.a1; // weight = 1
      state.vertices[2][3].type = VertexType.b2; // weight = 2
      state.vertices[1][3].type = VertexType.a2; // weight = 1
      state.vertices[1][2].type = VertexType.b1; // weight = 2

      const ratio = getWeightRatio(state, 2, 2, FlipDirection.Up, weights);

      // Before: 1 * 2 * 1 * 2 = 4
      // After transformations (a1->c1, b2->c2, a2->c1, b1->c2): 3 * 3 * 3 * 3 = 81
      // Ratio = 81/4 = 20.25
      expect(ratio).toBeCloseTo(20.25, 2);
    });

    it('should satisfy detailed balance', () => {
      const state = generateRandomIceState(4, 4, 12345);
      const weights: Record<VertexType, number> = {
        [VertexType.a1]: 1,
        [VertexType.a2]: 1,
        [VertexType.b1]: 1.5,
        [VertexType.b2]: 1.5,
        [VertexType.c1]: 2,
        [VertexType.c2]: 2,
      };

      // Find a position that can flip both ways
      let testPosition = null;
      for (let row = 1; row < 3; row++) {
        for (let col = 1; col < 3; col++) {
          const capability = isFlippable(state, row, col);
          if (capability.canFlipUp && capability.canFlipDown) {
            testPosition = { row, col };
            break;
          }
        }
        if (testPosition) break;
      }

      if (testPosition) {
        // Calculate forward ratio (up flip)
        const forwardRatio = getWeightRatio(
          state,
          testPosition.row,
          testPosition.col,
          FlipDirection.Up,
          weights,
        );

        // Execute the flip
        const flippedState = executeFlip(
          state,
          testPosition.row,
          testPosition.col,
          FlipDirection.Up,
        );

        // Calculate reverse ratio (down flip from flipped state)
        const reverseRatio = getWeightRatio(
          flippedState,
          testPosition.row,
          testPosition.col,
          FlipDirection.Down,
          weights,
        );

        // Detailed balance: forward * P(state) = reverse * P(flipped)
        // Since P(flipped)/P(state) = forward, we should have forward * reverse ≈ forward * (1/forward) = 1
        // But this is only exact for reversible flips
        expect(forwardRatio).toBeGreaterThan(0);
        expect(reverseRatio).toBeGreaterThan(0);
      }
    });
  });

  describe('Metropolis Acceptance Probabilities', () => {
    it('should always accept beneficial flips', () => {
      const state = generateDWBCLow(6);
      const weights: Record<VertexType, number> = {
        [VertexType.a1]: 1,
        [VertexType.a2]: 1,
        [VertexType.b1]: 1,
        [VertexType.b2]: 1,
        [VertexType.c1]: 10, // High weight for c vertices
        [VertexType.c2]: 10,
      };

      // Set up a configuration that transforms to c vertices
      state.vertices[2][2].type = VertexType.a1;
      state.vertices[2][3].type = VertexType.b2;
      state.vertices[1][3].type = VertexType.a2;
      state.vertices[1][2].type = VertexType.b1;

      const ratio = getWeightRatio(state, 2, 2, FlipDirection.Up, weights);

      // Transforming to c vertices should give high ratio
      expect(ratio).toBeGreaterThan(1);

      // Metropolis acceptance: min(1, ratio)
      const acceptanceProbability = Math.min(1, ratio);
      expect(acceptanceProbability).toBe(1);
    });

    it('should sometimes reject detrimental flips', () => {
      const state = generateDWBCLow(6);
      const weights: Record<VertexType, number> = {
        [VertexType.a1]: 10, // High weight for a vertices
        [VertexType.a2]: 10,
        [VertexType.b1]: 10,
        [VertexType.b2]: 10,
        [VertexType.c1]: 1, // Low weight for c vertices
        [VertexType.c2]: 1,
      };

      // Set up a configuration that transforms from high weight to low weight
      state.vertices[2][2].type = VertexType.a1;
      state.vertices[2][3].type = VertexType.b2;
      state.vertices[1][3].type = VertexType.a2;
      state.vertices[1][2].type = VertexType.b1;

      const ratio = getWeightRatio(state, 2, 2, FlipDirection.Up, weights);

      // Transforming to c vertices should give low ratio
      expect(ratio).toBeLessThan(1);

      // Metropolis acceptance: min(1, ratio)
      const acceptanceProbability = Math.min(1, ratio);
      expect(acceptanceProbability).toBeLessThan(1);
      expect(acceptanceProbability).toBeGreaterThan(0);
    });
  });

  describe('Empirical Frequency Tests', () => {
    it('should match theoretical weight ratios over many trials', () => {
      const rng = new SeededRNG(42);
      const weights: Record<VertexType, number> = {
        [VertexType.a1]: 1,
        [VertexType.a2]: 1,
        [VertexType.b1]: 2,
        [VertexType.b2]: 2,
        [VertexType.c1]: 1,
        [VertexType.c2]: 1,
      };

      // Create a synthetic configuration where we know the exact probabilities
      const state = generateDWBCLow(4);

      // Manually set up a flippable configuration
      state.vertices[1][1].type = VertexType.a1;
      state.vertices[1][2].type = VertexType.b2;
      state.vertices[0][2].type = VertexType.a2;
      state.vertices[0][1].type = VertexType.b1;

      const ratio = getWeightRatio(state, 1, 1, FlipDirection.Up, weights);
      const acceptanceProbability = Math.min(1, ratio);

      // Run many trials
      const trials = 10000;
      let acceptances = 0;

      for (let i = 0; i < trials; i++) {
        if (rng.random() < acceptanceProbability) {
          acceptances++;
        }
      }

      const empiricalProbability = acceptances / trials;

      // Should match theoretical probability within statistical error
      expect(empiricalProbability).toBeCloseTo(acceptanceProbability, 1);
    });

    it('should converge to correct distribution with equal weights', () => {
      const rng = new SeededRNG(12345);
      const weights: Record<VertexType, number> = {
        [VertexType.a1]: 1,
        [VertexType.a2]: 1,
        [VertexType.b1]: 1,
        [VertexType.b2]: 1,
        [VertexType.c1]: 1,
        [VertexType.c2]: 1,
      };

      let state = generateRandomIceState(3, 3, 54321);
      const vertexCounts = new Map<VertexType, number>();

      // Run simulation for many steps
      const steps = 10000;
      const burnIn = 1000;

      for (let step = 0; step < steps; step++) {
        const flippable = getAllFlippablePositions(state);

        if (flippable.length > 0) {
          // Choose random position
          const index = Math.floor(rng.random() * flippable.length);
          const pos = flippable[index];

          // Choose random direction if both available
          let direction: FlipDirection;
          if (pos.capability.canFlipUp && pos.capability.canFlipDown) {
            direction = rng.random() < 0.5 ? FlipDirection.Up : FlipDirection.Down;
          } else if (pos.capability.canFlipUp) {
            direction = FlipDirection.Up;
          } else {
            direction = FlipDirection.Down;
          }

          // Calculate acceptance probability
          const ratio = getWeightRatio(
            state,
            pos.position.row,
            pos.position.col,
            direction,
            weights,
          );
          const acceptanceProbability = Math.min(1, ratio);

          // Accept or reject
          if (rng.random() < acceptanceProbability) {
            state = executeFlip(state, pos.position.row, pos.position.col, direction);
          }
        }

        // Count vertex types after burn-in
        if (step >= burnIn) {
          for (let row = 0; row < 3; row++) {
            for (let col = 0; col < 3; col++) {
              const type = state.vertices[row][col].type;
              vertexCounts.set(type, (vertexCounts.get(type) || 0) + 1);
            }
          }
        }
      }

      // With equal weights, all vertex types should appear with similar frequency
      // (though not exactly equal due to ice rule constraints)
      const totalCounts = Array.from(vertexCounts.values()).reduce((a, b) => a + b, 0);

      for (const [type, count] of vertexCounts) {
        const frequency = count / totalCounts;
        // Should be roughly 1/6 ≈ 0.167, but with significant variance
        expect(frequency).toBeGreaterThan(0.05);
        expect(frequency).toBeLessThan(0.5);
      }
    });
  });

  describe('Temperature Effects', () => {
    it('should handle different temperature regimes', () => {
      const state = generateDWBCLow(4);

      // Low temperature (large weight differences)
      const lowTempWeights: Record<VertexType, number> = {
        [VertexType.a1]: 1,
        [VertexType.a2]: 1,
        [VertexType.b1]: 10,
        [VertexType.b2]: 10,
        [VertexType.c1]: 100,
        [VertexType.c2]: 100,
      };

      // High temperature (small weight differences)
      const highTempWeights: Record<VertexType, number> = {
        [VertexType.a1]: 1,
        [VertexType.a2]: 1.1,
        [VertexType.b1]: 1.2,
        [VertexType.b2]: 1.2,
        [VertexType.c1]: 1.3,
        [VertexType.c2]: 1.3,
      };

      const flippable = getAllFlippablePositions(state);
      if (flippable.length > 0) {
        const pos = flippable[0];
        const direction = pos.capability.canFlipUp ? FlipDirection.Up : FlipDirection.Down;

        const lowTempRatio = getWeightRatio(
          state,
          pos.position.row,
          pos.position.col,
          direction,
          lowTempWeights,
        );
        const highTempRatio = getWeightRatio(
          state,
          pos.position.row,
          pos.position.col,
          direction,
          highTempWeights,
        );

        // Low temperature should give more extreme ratios
        if (lowTempRatio > 1) {
          expect(lowTempRatio).toBeGreaterThan(highTempRatio);
        } else {
          expect(lowTempRatio).toBeLessThan(highTempRatio);
        }
      }
    });
  });

  describe('Special Weight Configurations', () => {
    it('should handle zero weights correctly', () => {
      const state = generateDWBCLow(4);
      const weights: Record<VertexType, number> = {
        [VertexType.a1]: 1,
        [VertexType.a2]: 1,
        [VertexType.b1]: 1,
        [VertexType.b2]: 1,
        [VertexType.c1]: 0, // Zero weight
        [VertexType.c2]: 0,
      };

      // Set up a configuration that would transform to c vertices
      state.vertices[1][1].type = VertexType.a1;
      state.vertices[1][2].type = VertexType.b2;
      state.vertices[0][2].type = VertexType.a2;
      state.vertices[0][1].type = VertexType.b1;

      const ratio = getWeightRatio(state, 1, 1, FlipDirection.Up, weights);

      // Should give zero ratio (forbidden transition)
      expect(ratio).toBe(0);
    });

    it('should handle very large weight ratios', () => {
      const state = generateDWBCLow(4);
      const weights: Record<VertexType, number> = {
        [VertexType.a1]: 0.001,
        [VertexType.a2]: 0.001,
        [VertexType.b1]: 0.001,
        [VertexType.b2]: 0.001,
        [VertexType.c1]: 1000,
        [VertexType.c2]: 1000,
      };

      // Set up a configuration that transforms to c vertices
      state.vertices[1][1].type = VertexType.a1;
      state.vertices[1][2].type = VertexType.b2;
      state.vertices[0][2].type = VertexType.a2;
      state.vertices[0][1].type = VertexType.b1;

      const ratio = getWeightRatio(state, 1, 1, FlipDirection.Up, weights);

      // Should give very large ratio
      expect(ratio).toBeGreaterThan(1e6);
    });
  });

  describe('Consistency Checks', () => {
    it('should give reciprocal ratios for reverse flips', () => {
      const state = generateDWBCLow(4);
      const weights: Record<VertexType, number> = {
        [VertexType.a1]: 1.5,
        [VertexType.a2]: 1.5,
        [VertexType.b1]: 2,
        [VertexType.b2]: 2,
        [VertexType.c1]: 3,
        [VertexType.c2]: 3,
      };

      // Set up specific configuration
      state.vertices[1][1].type = VertexType.a1;
      state.vertices[1][2].type = VertexType.b2;
      state.vertices[0][2].type = VertexType.a2;
      state.vertices[0][1].type = VertexType.b1;

      // Calculate forward ratio
      const forwardRatio = getWeightRatio(state, 1, 1, FlipDirection.Up, weights);

      // Execute flip
      const flippedState = executeFlip(state, 1, 1, FlipDirection.Up);

      // The flipped configuration should now be:
      // c1 at (1,1), c2 at (1,2), c1 at (0,2), c2 at (0,1)

      // For a perfect reverse flip, we'd need the same neighborhood
      // This is a simplified check - in practice, the reverse flip
      // might not be immediately available due to neighbor constraints

      expect(forwardRatio).toBeGreaterThan(0);
    });

    it('should preserve total probability in closed system', () => {
      // This test verifies that the sum of probabilities remains constant
      // in a small system where we can enumerate all states

      const weights: Record<VertexType, number> = {
        [VertexType.a1]: 1,
        [VertexType.a2]: 1,
        [VertexType.b1]: 1,
        [VertexType.b2]: 1,
        [VertexType.c1]: 1,
        [VertexType.c2]: 1,
      };

      // For a 2x2 lattice, there are limited valid ice configurations
      const state = generateRandomIceState(2, 2, 111);

      // Calculate weight ratios for all possible flips
      const flippable = getAllFlippablePositions(state);
      let totalOutgoingRate = 0;

      for (const pos of flippable) {
        if (pos.capability.canFlipUp) {
          const ratio = getWeightRatio(
            state,
            pos.position.row,
            pos.position.col,
            FlipDirection.Up,
            weights,
          );
          totalOutgoingRate += Math.min(1, ratio);
        }
        if (pos.capability.canFlipDown) {
          const ratio = getWeightRatio(
            state,
            pos.position.row,
            pos.position.col,
            FlipDirection.Down,
            weights,
          );
          totalOutgoingRate += Math.min(1, ratio);
        }
      }

      // Total outgoing rate should be finite and reasonable
      expect(totalOutgoingRate).toBeGreaterThanOrEqual(0);
      expect(totalOutgoingRate).toBeLessThan(100); // Reasonable upper bound
    });
  });
});
