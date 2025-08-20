/**
 * Seeded RNG reproducibility tests
 * Ensures deterministic behavior for debugging and scientific reproducibility
 */

import { PhysicsSimulation } from '../../src/lib/six-vertex/physicsSimulation';
import {
  generateRandomIceState,
  generateDWBCHigh,
  generateDWBCLow,
} from '../../src/lib/six-vertex/initialStates';
import {
  executeFlip,
  FlipDirection,
  getAllFlippablePositions,
  getWeightRatio,
} from '../../src/lib/six-vertex/physicsFlips';
import { VertexType, LatticeState } from '../../src/lib/six-vertex/types';
import { SeededRNG } from '../../src/lib/six-vertex/rng';

describe('Seeded RNG Reproducibility', () => {
  describe('Deterministic State Generation', () => {
    it('should generate identical random states with same seed', () => {
      const seed = 42;
      const state1 = generateRandomIceState(8, 8, seed);
      const state2 = generateRandomIceState(8, 8, seed);

      // States should be identical
      for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
          expect(state1.vertices[row][col].type).toBe(state2.vertices[row][col].type);
          expect(state1.vertices[row][col].configuration).toEqual(
            state2.vertices[row][col].configuration,
          );
        }
      }

      // Edge states should also match
      for (let row = 0; row <= 8; row++) {
        for (let col = 0; col < 8; col++) {
          expect(state1.verticalEdges[row][col]).toBe(state2.verticalEdges[row][col]);
        }
      }

      for (let row = 0; row < 8; row++) {
        for (let col = 0; col <= 8; col++) {
          expect(state1.horizontalEdges[row][col]).toBe(state2.horizontalEdges[row][col]);
        }
      }
    });

    it('should generate different states with different seeds', () => {
      const state1 = generateRandomIceState(8, 8, 12345);
      const state2 = generateRandomIceState(8, 8, 54321);

      // Count differences
      let differences = 0;
      for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
          if (state1.vertices[row][col].type !== state2.vertices[row][col].type) {
            differences++;
          }
        }
      }

      // Should have substantial differences
      expect(differences).toBeGreaterThan(20);
    });

    it('should generate reproducible sequences across runs', () => {
      const seeds = [1, 2, 3, 4, 5];
      const results: string[] = [];

      // First run
      for (const seed of seeds) {
        const state = generateRandomIceState(4, 4, seed);
        const signature = getStateSignature(state);
        results.push(signature);
      }

      // Second run - should match
      for (let i = 0; i < seeds.length; i++) {
        const state = generateRandomIceState(4, 4, seeds[i]);
        const signature = getStateSignature(state);
        expect(signature).toBe(results[i]);
      }
    });
  });

  describe('Deterministic Simulation Evolution', () => {
    it('should evolve identically with same seed and parameters', () => {
      const config = {
        width: 6,
        height: 6,
        initialState: 'random' as const,
        weights: {
          [VertexType.a1]: 1.5,
          [VertexType.a2]: 1.5,
          [VertexType.b1]: 2.0,
          [VertexType.b2]: 2.0,
          [VertexType.c1]: 2.5,
          [VertexType.c2]: 2.5,
        },
        seed: 98765,
      };

      const sim1 = new PhysicsSimulation(config);
      const sim2 = new PhysicsSimulation(config);

      // Run same number of steps
      for (let i = 0; i < 500; i++) {
        sim1.step();
        sim2.step();
      }

      // Final states should be identical
      const state1 = sim1.getState();
      const state2 = sim2.getState();

      for (let row = 0; row < 6; row++) {
        for (let col = 0; col < 6; col++) {
          expect(state1.vertices[row][col].type).toBe(state2.vertices[row][col].type);
        }
      }

      // Statistics should match
      expect(sim1.getStepCount()).toBe(sim2.getStepCount());
      expect(sim1.getAcceptanceRate()).toBe(sim2.getAcceptanceRate());
      expect(sim1.getHeight()).toBe(sim2.getHeight());

      const stats1 = sim1.getStatistics();
      const stats2 = sim2.getStatistics();
      expect(stats1.vertexCounts).toEqual(stats2.vertexCounts);
    });

    it('should diverge with different seeds', () => {
      const baseConfig = {
        width: 6,
        height: 6,
        initialState: 'random' as const,
        weights: {
          [VertexType.a1]: 1,
          [VertexType.a2]: 1,
          [VertexType.b1]: 1,
          [VertexType.b2]: 1,
          [VertexType.c1]: 1,
          [VertexType.c2]: 1,
        },
      };

      const sim1 = new PhysicsSimulation({ ...baseConfig, seed: 111 });
      const sim2 = new PhysicsSimulation({ ...baseConfig, seed: 222 });

      // Run same number of steps
      for (let i = 0; i < 100; i++) {
        sim1.step();
        sim2.step();
      }

      // States should differ
      const state1 = sim1.getState();
      const state2 = sim2.getState();

      let differences = 0;
      for (let row = 0; row < 6; row++) {
        for (let col = 0; col < 6; col++) {
          if (state1.vertices[row][col].type !== state2.vertices[row][col].type) {
            differences++;
          }
        }
      }

      expect(differences).toBeGreaterThan(0);
    });
  });

  describe('Reproducible Flip Sequences', () => {
    it('should execute same flip sequence with same RNG seed', () => {
      const state = generateDWBCLow(6);
      const rng1 = new SeededRNG(33333);
      const rng2 = new SeededRNG(33333);

      const weights: Record<VertexType, number> = {
        [VertexType.a1]: 1,
        [VertexType.a2]: 1,
        [VertexType.b1]: 2,
        [VertexType.b2]: 2,
        [VertexType.c1]: 3,
        [VertexType.c2]: 3,
      };

      let state1 = state;
      let state2 = state;

      // Execute same sequence of random flips
      for (let step = 0; step < 50; step++) {
        const flippable1 = getAllFlippablePositions(state1);
        const flippable2 = getAllFlippablePositions(state2);

        expect(flippable1.length).toBe(flippable2.length);

        if (flippable1.length > 0) {
          // Choose same random position
          const index1 = Math.floor(rng1.random() * flippable1.length);
          const index2 = Math.floor(rng2.random() * flippable2.length);
          expect(index1).toBe(index2);

          const pos1 = flippable1[index1];
          const pos2 = flippable2[index2];

          // Choose same direction
          let dir1: FlipDirection;
          let dir2: FlipDirection;

          if (pos1.capability.canFlipUp && pos1.capability.canFlipDown) {
            dir1 = rng1.random() < 0.5 ? FlipDirection.Up : FlipDirection.Down;
          } else {
            dir1 = pos1.capability.canFlipUp ? FlipDirection.Up : FlipDirection.Down;
          }

          if (pos2.capability.canFlipUp && pos2.capability.canFlipDown) {
            dir2 = rng2.random() < 0.5 ? FlipDirection.Up : FlipDirection.Down;
          } else {
            dir2 = pos2.capability.canFlipUp ? FlipDirection.Up : FlipDirection.Down;
          }

          expect(dir1).toBe(dir2);

          // Calculate same acceptance probability
          const ratio1 = getWeightRatio(
            state1,
            pos1.position.row,
            pos1.position.col,
            dir1,
            weights,
          );
          const ratio2 = getWeightRatio(
            state2,
            pos2.position.row,
            pos2.position.col,
            dir2,
            weights,
          );
          expect(ratio1).toBe(ratio2);

          // Make same acceptance decision
          const accept1 = rng1.random() < Math.min(1, ratio1);
          const accept2 = rng2.random() < Math.min(1, ratio2);
          expect(accept1).toBe(accept2);

          if (accept1) {
            state1 = executeFlip(state1, pos1.position.row, pos1.position.col, dir1);
            state2 = executeFlip(state2, pos2.position.row, pos2.position.col, dir2);
          }
        }
      }

      // Final states should be identical
      expect(getStateSignature(state1)).toBe(getStateSignature(state2));
    });
  });

  describe('Cross-platform Reproducibility', () => {
    it('should produce same results regardless of execution order', () => {
      // Test that operations are order-independent when using same seed
      const seed = 77777;

      // Path 1: Generate state then run simulation
      const rng1 = new SeededRNG(seed);
      const state1 = generateRandomIceState(4, 4, seed);
      const values1 = Array.from({ length: 10 }, () => rng1.random());

      // Path 2: Run RNG then generate state
      const rng2 = new SeededRNG(seed);
      const values2 = Array.from({ length: 10 }, () => rng2.random());
      const state2 = generateRandomIceState(4, 4, seed);

      // Random values should differ (different order)
      expect(values1).not.toEqual(values2);

      // But states with same seed should match
      expect(getStateSignature(state1)).toBe(getStateSignature(state2));
    });

    it('should maintain reproducibility after reset', () => {
      const simulation = new PhysicsSimulation({
        width: 4,
        height: 4,
        initialState: 'dwbc-high',
        weights: {
          [VertexType.a1]: 1,
          [VertexType.a2]: 1,
          [VertexType.b1]: 1,
          [VertexType.b2]: 1,
          [VertexType.c1]: 1,
          [VertexType.c2]: 1,
        },
        seed: 88888,
      });

      // Run simulation
      for (let i = 0; i < 100; i++) {
        simulation.step();
      }

      const stateAfterRun = getStateSignature(simulation.getState());

      // Reset and run again
      simulation.reset();

      for (let i = 0; i < 100; i++) {
        simulation.step();
      }

      const stateAfterReset = getStateSignature(simulation.getState());

      // Should produce same result
      expect(stateAfterReset).toBe(stateAfterRun);
    });
  });

  describe('Seed Independence', () => {
    it('should not interfere between independent RNG instances', () => {
      const rng1 = new SeededRNG(100);
      const rng2 = new SeededRNG(200);

      const sequence1: number[] = [];
      const sequence2: number[] = [];

      // Interleave calls
      for (let i = 0; i < 20; i++) {
        sequence1.push(rng1.random());
        sequence2.push(rng2.random());
      }

      // Now compare with non-interleaved
      const rng3 = new SeededRNG(100);
      const rng4 = new SeededRNG(200);

      const expected1 = Array.from({ length: 20 }, () => rng3.random());
      const expected2 = Array.from({ length: 20 }, () => rng4.random());

      expect(sequence1).toEqual(expected1);
      expect(sequence2).toEqual(expected2);
    });

    it('should maintain separate seeds for different simulations', () => {
      const sim1 = new PhysicsSimulation({
        width: 4,
        height: 4,
        initialState: 'random',
        weights: {
          [VertexType.a1]: 1,
          [VertexType.a2]: 1,
          [VertexType.b1]: 1,
          [VertexType.b2]: 1,
          [VertexType.c1]: 1,
          [VertexType.c2]: 1,
        },
        seed: 1234,
      });

      const sim2 = new PhysicsSimulation({
        width: 4,
        height: 4,
        initialState: 'random',
        weights: {
          [VertexType.a1]: 1,
          [VertexType.a2]: 1,
          [VertexType.b1]: 1,
          [VertexType.b2]: 1,
          [VertexType.c1]: 1,
          [VertexType.c2]: 1,
        },
        seed: 5678,
      });

      // Run both simulations
      for (let i = 0; i < 50; i++) {
        sim1.step();
        sim2.step();
      }

      // States should differ
      const state1 = sim1.getState();
      const state2 = sim2.getState();

      expect(getStateSignature(state1)).not.toBe(getStateSignature(state2));
    });
  });

  describe('Statistical Reproducibility', () => {
    it('should produce same statistical distributions with same seed', () => {
      const runSimulation = (seed: number) => {
        const rng = new SeededRNG(seed);
        const counts: Record<VertexType, number> = {
          [VertexType.a1]: 0,
          [VertexType.a2]: 0,
          [VertexType.b1]: 0,
          [VertexType.b2]: 0,
          [VertexType.c1]: 0,
          [VertexType.c2]: 0,
        };

        // Generate many random states and count vertex types
        for (let i = 0; i < 100; i++) {
          const state = generateRandomIceState(4, 4, seed + i);

          for (let row = 0; row < 4; row++) {
            for (let col = 0; col < 4; col++) {
              counts[state.vertices[row][col].type]++;
            }
          }
        }

        return counts;
      };

      const counts1 = runSimulation(99999);
      const counts2 = runSimulation(99999);

      // Should produce identical distributions
      expect(counts1).toEqual(counts2);
    });

    it('should maintain reproducible acceptance rates', () => {
      const config = {
        width: 6,
        height: 6,
        initialState: 'random' as const,
        weights: {
          [VertexType.a1]: 0.5,
          [VertexType.a2]: 0.5,
          [VertexType.b1]: 1.0,
          [VertexType.b2]: 1.0,
          [VertexType.c1]: 2.0,
          [VertexType.c2]: 2.0,
        },
        seed: 13579,
      };

      const rates: number[] = [];

      // Run simulation multiple times with same seed
      for (let run = 0; run < 3; run++) {
        const sim = new PhysicsSimulation(config);

        for (let i = 0; i < 1000; i++) {
          sim.step();
        }

        rates.push(sim.getAcceptanceRate());
      }

      // All runs should have identical acceptance rate
      expect(rates[0]).toBe(rates[1]);
      expect(rates[1]).toBe(rates[2]);
    });
  });
});

// Helper function to create state signature
function getStateSignature(state: LatticeState): string {
  const types: string[] = [];
  for (let row = 0; row < state.height; row++) {
    for (let col = 0; col < state.width; col++) {
      types.push(state.vertices[row][col].type);
    }
  }
  return types.join(',');
}
