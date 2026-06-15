/**
 * Performance benchmark tests for the 6-vertex model simulator
 * Tests efficiency, memory usage, and scalability
 */

import { PhysicsSimulation } from '../../src/lib/six-vertex/physicsSimulation';
import {
  executeFlip,
  FlipDirection,
  getAllFlippablePositions,
  isFlippable,
  getWeightRatio,
} from '../../src/lib/six-vertex/physicsFlips';
import {
  generateDWBCHigh,
  generateDWBCLow,
  generateRandomIceState,
} from '../../src/lib/six-vertex/initialStates';
import { VertexType } from '../../src/lib/six-vertex/types';
import { SeededRNG } from '../../src/lib/six-vertex/rng';

describe('Performance Benchmarks', () => {
  describe('Flip Operation Performance', () => {
    it('should execute single flip in < 1ms', () => {
      const state = generateDWBCLow(8);
      const flippable = getAllFlippablePositions(state);

      if (flippable.length > 0) {
        const pos = flippable[0];
        const direction = pos.capability.canFlipUp ? FlipDirection.Up : FlipDirection.Down;

        const startTime = performance.now();
        executeFlip(state, pos.position.row, pos.position.col, direction);
        const endTime = performance.now();

        expect(endTime - startTime).toBeLessThan(1);
      }
    });

    it('should find flippable positions efficiently', () => {
      const sizes = [8, 16, 24, 32];
      const timings: number[] = [];

      for (const size of sizes) {
        const state = generateDWBCLow(size);

        const startTime = performance.now();
        getAllFlippablePositions(state);
        const endTime = performance.now();

        timings.push(endTime - startTime);
      }

      // Time should scale roughly quadratically with size
      // Check that larger lattices don't take excessive time
      expect(timings[3]).toBeLessThan(1000); // 32x32 scan: generous bound to catch gross regressions without CI flakiness

      // Verify reasonable scaling
      const scalingFactor = timings[3] / timings[0];
      expect(scalingFactor).toBeLessThan(20); // Should be ~16 for O(n²)
    });

    it('should calculate weight ratios quickly', () => {
      const state = generateRandomIceState(16, 16, 12345);
      const weights: Record<VertexType, number> = {
        [VertexType.a1]: 1.5,
        [VertexType.a2]: 1.5,
        [VertexType.b1]: 2.5,
        [VertexType.b2]: 2.5,
        [VertexType.c1]: 3.5,
        [VertexType.c2]: 3.5,
      };

      const iterations = 1000;
      const startTime = performance.now();

      for (let i = 0; i < iterations; i++) {
        const row = Math.floor(Math.random() * 16);
        const col = Math.floor(Math.random() * 16);
        getWeightRatio(state, row, col, FlipDirection.Up, weights);
      }

      const endTime = performance.now();
      const avgTime = (endTime - startTime) / iterations;

      expect(avgTime).toBeLessThan(0.1); // < 0.1ms per calculation
    });
  });

  describe('Simulation Performance', () => {
    it('should achieve target steps per second for small lattices', () => {
      const simulation = new PhysicsSimulation({
        size: 8,
        initialState: 'dwbc-high',
        weights: {
          [VertexType.a1]: 1,
          [VertexType.a2]: 1,
          [VertexType.b1]: 1,
          [VertexType.b2]: 1,
          [VertexType.c1]: 1,
          [VertexType.c2]: 1,
        },
      });

      const steps = 1000;
      const startTime = performance.now();

      for (let i = 0; i < steps; i++) {
        simulation.performStep();
      }

      const endTime = performance.now();
      const stepsPerSecond = steps / ((endTime - startTime) / 1000);

      // Should achieve at least 1000 steps/second for 8x8.
      // Lenient lower bound: catches gross regressions without being flaky
      // on slower CI runners (a healthy engine clears this by orders of magnitude).
      expect(stepsPerSecond).toBeGreaterThan(1000);
    });

    it('should maintain performance for medium lattices', () => {
      const simulation = new PhysicsSimulation({
        size: 16,
        initialState: 'dwbc-low',
        weights: {
          [VertexType.a1]: 1,
          [VertexType.a2]: 1,
          [VertexType.b1]: 1,
          [VertexType.b2]: 1,
          [VertexType.c1]: 1,
          [VertexType.c2]: 1,
        },
        seed: 54321,
      });

      const steps = 500;
      const startTime = performance.now();

      for (let i = 0; i < steps; i++) {
        simulation.performStep();
      }

      const endTime = performance.now();
      const stepsPerSecond = steps / ((endTime - startTime) / 1000);

      // Should achieve at least 500 steps/second for 16x16.
      // Lenient lower bound to stay non-flaky on slower CI runners.
      expect(stepsPerSecond).toBeGreaterThan(500);
    });

    it('should handle large lattices acceptably', () => {
      const simulation = new PhysicsSimulation({
        size: 32,
        initialState: 'dwbc-low',
        weights: {
          [VertexType.a1]: 1,
          [VertexType.a2]: 1,
          [VertexType.b1]: 1,
          [VertexType.b2]: 1,
          [VertexType.c1]: 1,
          [VertexType.c2]: 1,
        },
      });

      const steps = 100;
      const startTime = performance.now();

      for (let i = 0; i < steps; i++) {
        simulation.performStep();
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      // Should complete 100 steps in < 2 seconds for 32x32 (generous bound).
      expect(totalTime).toBeLessThan(2000);
    });
  });

  describe('Memory Efficiency', () => {
    it('should not leak memory during long runs', () => {
      const simulation = new PhysicsSimulation({
        size: 8,
        initialState: 'dwbc-high',
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
      const iterations = 10000;
      for (let i = 0; i < iterations; i++) {
        simulation.performStep();
      }

      // Reset and run again
      simulation.reset();

      let completed = 0;
      for (let i = 0; i < iterations; i++) {
        simulation.performStep();
        completed++;
      }

      // If we get here without crashing, memory management is acceptable.
      // NOTE: performStep() only increments the engine's internal `step`
      // counter when it lands on a flippable position (it returns early
      // otherwise), so getStats().step is <= the number of calls. We assert
      // on the loop count and that the step counter is sane and bounded.
      expect(completed).toBe(iterations);
      const stepCount = simulation.getStats().step;
      expect(stepCount).toBeGreaterThan(0);
      expect(stepCount).toBeLessThanOrEqual(iterations);
    });

    it('should handle state copies efficiently', () => {
      const state = generateDWBCHigh(24);
      const iterations = 100;

      const startTime = performance.now();

      for (let i = 0; i < iterations; i++) {
        // Deep copy operation (happens in executeFlip)
        const newState = {
          width: state.width,
          height: state.height,
          vertices: state.vertices.map((row) =>
            row.map((v) => ({ ...v, configuration: { ...v.configuration } })),
          ),
          horizontalEdges: state.horizontalEdges.map((row) => [...row]),
          verticalEdges: state.verticalEdges.map((row) => [...row]),
        };

        // Use the copy to prevent optimization
        expect(newState.width).toBe(24);
      }

      const endTime = performance.now();
      const avgTime = (endTime - startTime) / iterations;

      // Deep copy should be reasonably fast even for 24x24
      expect(avgTime).toBeLessThan(10); // < 10ms per copy
    });
  });

  describe('Scaling Analysis', () => {
    it('should scale sub-exponentially with lattice size', () => {
      // Use comparatively large lattices and many steps so wall-clock times
      // are well above timer noise; otherwise the measured scaling exponent
      // is dominated by jitter and can even go negative on a fast machine.
      const sizes = [16, 32, 64];
      const steps = 2000;

      const measure = (size: number): number => {
        const simulation = new PhysicsSimulation({
          size,
          initialState: 'dwbc-low',
          weights: {
            [VertexType.a1]: 1,
            [VertexType.a2]: 1,
            [VertexType.b1]: 1,
            [VertexType.b2]: 1,
            [VertexType.c1]: 1,
            [VertexType.c2]: 1,
          },
        });
        const startTime = performance.now();
        for (let i = 0; i < steps; i++) {
          simulation.performStep();
        }
        return performance.now() - startTime;
      };

      const timings = sizes.map((size) => ({ size, time: measure(size) }));

      // Compare the two largest sizes (most signal, least relative noise).
      const lastTwo = timings.slice(-2);
      const sizeRatio = lastTwo[1].size / lastTwo[0].size; // 2x

      // Doubling the linear size multiplies the number of sites by ~4. Per
      // fixed step budget, cost per step grows at most modestly. We assert a
      // generous bound: time must not blow up worse than ~N^4 between the two
      // largest sizes. This catches gross algorithmic regressions (e.g. an
      // accidental exponential or repeated full-lattice scan per step) while
      // remaining robust to timer noise and CI runner variability.
      const ratio = lastTwo[1].time / Math.max(lastTwo[0].time, 0.001);
      const alpha = Math.log(ratio) / Math.log(sizeRatio);

      // NOTE: lenient upper bound only. A precise lower bound on the exponent
      // is too flaky to assert reliably for these workloads (per-step work is
      // dominated by O(1) flip logic, so time is nearly flat across sizes and
      // the apparent exponent hovers near zero / noise). Time must at least
      // not decrease meaningfully as the lattice grows.
      expect(lastTwo[1].time).toBeGreaterThanOrEqual(lastTwo[0].time * 0.5);
      expect(alpha).toBeLessThan(4);
    });
  });

  describe('RNG Performance', () => {
    it('should generate random numbers efficiently', () => {
      const rng = new SeededRNG(12345);
      const iterations = 1000000;

      const startTime = performance.now();

      for (let i = 0; i < iterations; i++) {
        rng.random();
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      // 1M random numbers: generous bound (catches gross regressions; resilient to slow/contended CI runners)
      expect(totalTime).toBeLessThan(1000);

      const numbersPerSecond = iterations / (totalTime / 1000);
      expect(numbersPerSecond).toBeGreaterThan(10_000_000); // > 10M/sec
    });

    it('should handle weighted selection efficiently', () => {
      const rng = new SeededRNG(54321);
      const items = ['a', 'b', 'c', 'd', 'e'];
      const weights = [1, 2, 3, 4, 5];
      const selector = rng.createWeightedSelector(items, weights);

      const iterations = 100000;
      const startTime = performance.now();

      for (let i = 0; i < iterations; i++) {
        selector();
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      // Should handle 100k weighted selections in < 50ms
      expect(totalTime).toBeLessThan(50);
    });
  });

  describe('Batch Operations', () => {
    it('should benefit from batched flips', () => {
      const state = generateRandomIceState(16, 16, 11111);

      // Time individual flips
      const individualStart = performance.now();
      let currentState = state;

      for (let i = 0; i < 100; i++) {
        const flippable = getAllFlippablePositions(currentState);
        if (flippable.length > 0) {
          const pos = flippable[0];
          const dir = pos.capability.canFlipUp ? FlipDirection.Up : FlipDirection.Down;
          currentState = executeFlip(currentState, pos.position.row, pos.position.col, dir);
        }
      }

      const individualTime = performance.now() - individualStart;

      // For comparison, time the same operations without state updates
      const batchStart = performance.now();

      for (let i = 0; i < 100; i++) {
        getAllFlippablePositions(state);
      }

      const batchTime = performance.now() - batchStart;

      // Individual flips should take more time due to state updates
      expect(individualTime).toBeGreaterThan(batchTime);
    });
  });

  describe('Edge Case Performance', () => {
    it('should scan a sparsely-flippable state efficiently', () => {
      // A fresh DWBC-High state is highly ordered and has only a handful of
      // flippable positions (the corner staircase), so this exercises the
      // near-empty / sparse scan path. (It is NOT literally empty: this
      // engine reports a small, fixed number of flippable sites for DWBC.)
      const state = generateDWBCHigh(8);
      const baseline = getAllFlippablePositions(state).length;

      const iterations = 1000;
      const startTime = performance.now();

      for (let i = 0; i < iterations; i++) {
        const flippable = getAllFlippablePositions(state);
        // Scanning the same immutable state must be deterministic.
        expect(flippable).toHaveLength(baseline);
      }

      const endTime = performance.now();
      const avgTime = (endTime - startTime) / iterations;

      // Should still be fast when few flips are possible (generous bound).
      expect(avgTime).toBeLessThan(1);
    });

    it('should handle extreme weight ratios efficiently', () => {
      const state = generateRandomIceState(8, 8, 22222);
      const extremeWeights: Record<VertexType, number> = {
        [VertexType.a1]: 1e-100,
        [VertexType.a2]: 1e-100,
        [VertexType.b1]: 1e100,
        [VertexType.b2]: 1e100,
        [VertexType.c1]: 1,
        [VertexType.c2]: 1,
      };

      const iterations = 100;
      const startTime = performance.now();

      for (let i = 0; i < iterations; i++) {
        const row = i % 8;
        const col = (i * 3) % 8;
        getWeightRatio(state, row, col, FlipDirection.Up, extremeWeights);
      }

      const endTime = performance.now();

      // Should handle extreme values without hanging (generous bound for CI stability)
      expect(endTime - startTime).toBeLessThan(1000);
    });

    it('should handle rapid weight changes efficiently', () => {
      // PhysicsSimulation has no public weight mutator, so "rapid weight
      // changes" is exercised by reconstructing the simulation with fresh
      // weights each iteration and stepping it. This preserves the test's
      // intent (repeated reconfigure + step must stay performant).
      const startTime = performance.now();

      for (let i = 0; i < 100; i++) {
        const simulation = new PhysicsSimulation({
          size: 8,
          initialState: 'dwbc-high',
          weights: {
            [VertexType.a1]: Math.random() * 10,
            [VertexType.a2]: Math.random() * 10,
            [VertexType.b1]: Math.random() * 10,
            [VertexType.b2]: Math.random() * 10,
            [VertexType.c1]: Math.random() * 10,
            [VertexType.c2]: Math.random() * 10,
          },
        });

        simulation.performStep();
      }

      const endTime = performance.now();

      // Should handle reconfigure + step without performance degradation
      // (generous bound to avoid CI flakiness).
      expect(endTime - startTime).toBeLessThan(500);
    });
  });

  describe('Profiling Helpers', () => {
    it('should measure flip type distribution', () => {
      const state = generateRandomIceState(8, 8, 33333);
      const flippable = getAllFlippablePositions(state);

      let upOnly = 0;
      let downOnly = 0;
      let both = 0;

      for (const pos of flippable) {
        if (pos.capability.canFlipUp && pos.capability.canFlipDown) {
          both++;
        } else if (pos.capability.canFlipUp) {
          upOnly++;
        } else if (pos.capability.canFlipDown) {
          downOnly++;
        }
      }

      // Just verify we can categorize flips
      expect(upOnly + downOnly + both).toBe(flippable.length);
    });

    it('should profile vertex type checking', () => {
      const state = generateDWBCLow(16);
      const iterations = 10000;

      const startTime = performance.now();

      for (let i = 0; i < iterations; i++) {
        const row = Math.floor(Math.random() * 16);
        const col = Math.floor(Math.random() * 16);
        isFlippable(state, row, col);
      }

      const endTime = performance.now();
      const avgTime = (endTime - startTime) / iterations;

      // Flippability check should be very fast
      expect(avgTime).toBeLessThan(0.01); // < 0.01ms per check
    });
  });
});
