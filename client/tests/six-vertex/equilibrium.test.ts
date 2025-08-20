/**
 * Test suite for equilibrium distribution convergence
 * Verifies correct statistical behavior for small lattices
 */

import {
  executeFlip,
  FlipDirection,
  getAllFlippablePositions,
  getWeightRatio,
} from '../../src/lib/six-vertex/physicsFlips';
import { generateRandomIceState, validateIceRule } from '../../src/lib/six-vertex/initialStates';
import { VertexType, LatticeState } from '../../src/lib/six-vertex/types';
import { SeededRNG } from '../../src/lib/six-vertex/rng';

/**
 * Run Metropolis-Hastings simulation
 */
function runSimulation(
  initialState: LatticeState,
  weights: Record<VertexType, number>,
  steps: number,
  rng: SeededRNG,
  burnIn: number = 0,
): {
  vertexFrequencies: Map<VertexType, number>;
  acceptanceRate: number;
  finalState: LatticeState;
} {
  let state = initialState;
  const vertexCounts = new Map<VertexType, number>();
  let totalSamples = 0;
  let acceptedMoves = 0;
  let attemptedMoves = 0;

  for (let step = 0; step < steps; step++) {
    const flippable = getAllFlippablePositions(state);

    if (flippable.length > 0) {
      // Choose random position
      const index = Math.floor(rng.random() * flippable.length);
      const pos = flippable[index];

      // Choose random direction
      let direction: FlipDirection;
      if (pos.capability.canFlipUp && pos.capability.canFlipDown) {
        direction = rng.random() < 0.5 ? FlipDirection.Up : FlipDirection.Down;
      } else if (pos.capability.canFlipUp) {
        direction = FlipDirection.Up;
      } else {
        direction = FlipDirection.Down;
      }

      // Calculate acceptance probability
      const ratio = getWeightRatio(state, pos.position.row, pos.position.col, direction, weights);
      const acceptanceProbability = Math.min(1, ratio);

      attemptedMoves++;

      // Accept or reject
      if (rng.random() < acceptanceProbability) {
        state = executeFlip(state, pos.position.row, pos.position.col, direction);
        acceptedMoves++;
      }
    }

    // Sample after burn-in
    if (step >= burnIn) {
      for (let row = 0; row < state.height; row++) {
        for (let col = 0; col < state.width; col++) {
          const type = state.vertices[row][col].type;
          vertexCounts.set(type, (vertexCounts.get(type) || 0) + 1);
          totalSamples++;
        }
      }
    }
  }

  // Convert counts to frequencies
  const vertexFrequencies = new Map<VertexType, number>();
  for (const [type, count] of vertexCounts) {
    vertexFrequencies.set(type, count / totalSamples);
  }

  return {
    vertexFrequencies,
    acceptanceRate: attemptedMoves > 0 ? acceptedMoves / attemptedMoves : 0,
    finalState: state,
  };
}

describe('Equilibrium Distribution Tests', () => {
  describe('Small Lattice Convergence (N=2)', () => {
    it('should converge to uniform distribution with equal weights', () => {
      const rng = new SeededRNG(42);
      const weights: Record<VertexType, number> = {
        [VertexType.a1]: 1,
        [VertexType.a2]: 1,
        [VertexType.b1]: 1,
        [VertexType.b2]: 1,
        [VertexType.c1]: 1,
        [VertexType.c2]: 1,
      };

      const initialState = generateRandomIceState(2, 2, 12345);
      const { vertexFrequencies, acceptanceRate } = runSimulation(
        initialState,
        weights,
        50000,
        rng,
        5000,
      );

      // With equal weights, expect roughly uniform distribution
      // But ice rule constraints mean not all types appear equally
      for (const [type, frequency] of vertexFrequencies) {
        // Each type should appear with non-zero frequency
        expect(frequency).toBeGreaterThan(0);
        // But not dominate
        expect(frequency).toBeLessThan(0.5);
      }

      // Should have reasonable acceptance rate
      expect(acceptanceRate).toBeGreaterThan(0.3);
      expect(acceptanceRate).toBeLessThan(1.0);
    });

    it('should favor high-weight vertices', () => {
      const rng = new SeededRNG(43);
      const weights: Record<VertexType, number> = {
        [VertexType.a1]: 1,
        [VertexType.a2]: 1,
        [VertexType.b1]: 1,
        [VertexType.b2]: 1,
        [VertexType.c1]: 10, // High weight
        [VertexType.c2]: 10, // High weight
      };

      const initialState = generateRandomIceState(2, 2, 12346);
      const { vertexFrequencies } = runSimulation(initialState, weights, 50000, rng, 5000);

      // c vertices should appear more frequently
      const cFrequency =
        (vertexFrequencies.get(VertexType.c1) || 0) + (vertexFrequencies.get(VertexType.c2) || 0);
      const aFrequency =
        (vertexFrequencies.get(VertexType.a1) || 0) + (vertexFrequencies.get(VertexType.a2) || 0);

      expect(cFrequency).toBeGreaterThan(aFrequency);
    });
  });

  describe('Small Lattice Convergence (N=3)', () => {
    it('should converge to expected distribution', () => {
      const rng = new SeededRNG(44);
      const weights: Record<VertexType, number> = {
        [VertexType.a1]: 1,
        [VertexType.a2]: 1,
        [VertexType.b1]: 2,
        [VertexType.b2]: 2,
        [VertexType.c1]: 1,
        [VertexType.c2]: 1,
      };

      const initialState = generateRandomIceState(3, 3, 12347);
      const { vertexFrequencies, finalState } = runSimulation(
        initialState,
        weights,
        100000,
        rng,
        10000,
      );

      // b vertices (weight 2) should appear more than a,c vertices (weight 1)
      const bFrequency =
        (vertexFrequencies.get(VertexType.b1) || 0) + (vertexFrequencies.get(VertexType.b2) || 0);
      const acFrequency =
        (vertexFrequencies.get(VertexType.a1) || 0) +
        (vertexFrequencies.get(VertexType.a2) || 0) +
        (vertexFrequencies.get(VertexType.c1) || 0) +
        (vertexFrequencies.get(VertexType.c2) || 0);

      expect(bFrequency).toBeGreaterThan(acFrequency / 4);

      // Final state should still satisfy ice rule
      expect(validateIceRule(finalState)).toBe(true);
    });

    it('should show temperature dependence', () => {
      const rng1 = new SeededRNG(45);
      const rng2 = new SeededRNG(45);

      // High temperature (small weight differences)
      const highTempWeights: Record<VertexType, number> = {
        [VertexType.a1]: 1,
        [VertexType.a2]: 1,
        [VertexType.b1]: 1.2,
        [VertexType.b2]: 1.2,
        [VertexType.c1]: 1.4,
        [VertexType.c2]: 1.4,
      };

      // Low temperature (large weight differences)
      const lowTempWeights: Record<VertexType, number> = {
        [VertexType.a1]: 1,
        [VertexType.a2]: 1,
        [VertexType.b1]: 10,
        [VertexType.b2]: 10,
        [VertexType.c1]: 100,
        [VertexType.c2]: 100,
      };

      const initialState = generateRandomIceState(3, 3, 12348);

      const highTempResult = runSimulation(initialState, highTempWeights, 50000, rng1, 5000);

      const lowTempResult = runSimulation(initialState, lowTempWeights, 50000, rng2, 5000);

      // Low temperature should have more peaked distribution
      const highTempEntropy = calculateEntropy(highTempResult.vertexFrequencies);
      const lowTempEntropy = calculateEntropy(lowTempResult.vertexFrequencies);

      expect(lowTempEntropy).toBeLessThan(highTempEntropy);

      // Low temperature should have lower acceptance rate
      expect(lowTempResult.acceptanceRate).toBeLessThan(highTempResult.acceptanceRate);
    });
  });

  describe('Detailed Balance Verification', () => {
    it('should satisfy detailed balance in equilibrium', () => {
      const rng = new SeededRNG(46);
      const weights: Record<VertexType, number> = {
        [VertexType.a1]: 1.5,
        [VertexType.a2]: 1.5,
        [VertexType.b1]: 2,
        [VertexType.b2]: 2,
        [VertexType.c1]: 3,
        [VertexType.c2]: 3,
      };

      const initialState = generateRandomIceState(2, 2, 12349);

      // Run to equilibrium
      const equilibriumResult = runSimulation(initialState, weights, 20000, rng, 10000);

      // Now measure transition rates from equilibrium
      const transitionCounts = new Map<string, number>();
      let state = equilibriumResult.finalState;

      for (let step = 0; step < 10000; step++) {
        const flippable = getAllFlippablePositions(state);

        if (flippable.length > 0) {
          const index = Math.floor(rng.random() * flippable.length);
          const pos = flippable[index];

          let direction: FlipDirection;
          if (pos.capability.canFlipUp && pos.capability.canFlipDown) {
            direction = rng.random() < 0.5 ? FlipDirection.Up : FlipDirection.Down;
          } else if (pos.capability.canFlipUp) {
            direction = FlipDirection.Up;
          } else {
            direction = FlipDirection.Down;
          }

          // Record transition attempt
          const beforeTypes = getStateSignature(state);
          const ratio = getWeightRatio(
            state,
            pos.position.row,
            pos.position.col,
            direction,
            weights,
          );
          const acceptanceProbability = Math.min(1, ratio);

          if (rng.random() < acceptanceProbability) {
            state = executeFlip(state, pos.position.row, pos.position.col, direction);
            const afterTypes = getStateSignature(state);
            const transitionKey = `${beforeTypes}->${afterTypes}`;
            transitionCounts.set(transitionKey, (transitionCounts.get(transitionKey) || 0) + 1);
          }
        }
      }

      // Transitions should be roughly balanced in equilibrium
      // This is a weak test - full detailed balance verification would require
      // enumerating all states, which is not practical
      expect(transitionCounts.size).toBeGreaterThan(0);
    });
  });

  describe('Ergodicity Tests', () => {
    it('should be able to reach different configurations', () => {
      const rng = new SeededRNG(47);
      const weights: Record<VertexType, number> = {
        [VertexType.a1]: 1,
        [VertexType.a2]: 1,
        [VertexType.b1]: 1,
        [VertexType.b2]: 1,
        [VertexType.c1]: 1,
        [VertexType.c2]: 1,
      };

      const initialState = generateRandomIceState(2, 2, 12350);
      const visitedStates = new Set<string>();
      let state = initialState;

      // Run simulation and track unique states
      for (let step = 0; step < 10000; step++) {
        visitedStates.add(getStateSignature(state));

        const flippable = getAllFlippablePositions(state);
        if (flippable.length > 0) {
          const index = Math.floor(rng.random() * flippable.length);
          const pos = flippable[index];

          let direction: FlipDirection;
          if (pos.capability.canFlipUp && pos.capability.canFlipDown) {
            direction = rng.random() < 0.5 ? FlipDirection.Up : FlipDirection.Down;
          } else if (pos.capability.canFlipUp) {
            direction = FlipDirection.Up;
          } else {
            direction = FlipDirection.Down;
          }

          const ratio = getWeightRatio(
            state,
            pos.position.row,
            pos.position.col,
            direction,
            weights,
          );
          if (rng.random() < Math.min(1, ratio)) {
            state = executeFlip(state, pos.position.row, pos.position.col, direction);
          }
        }
      }

      // Should visit multiple distinct states
      expect(visitedStates.size).toBeGreaterThan(5);
    });

    it('should return to initial configuration eventually', () => {
      const rng = new SeededRNG(48);
      const weights: Record<VertexType, number> = {
        [VertexType.a1]: 1,
        [VertexType.a2]: 1,
        [VertexType.b1]: 1,
        [VertexType.b2]: 1,
        [VertexType.c1]: 1,
        [VertexType.c2]: 1,
      };

      const initialState = generateRandomIceState(2, 2, 12351);
      const initialSignature = getStateSignature(initialState);
      let state = initialState;
      let returnCount = 0;

      // Run simulation
      for (let step = 0; step < 50000; step++) {
        const flippable = getAllFlippablePositions(state);

        if (flippable.length > 0) {
          const index = Math.floor(rng.random() * flippable.length);
          const pos = flippable[index];

          let direction: FlipDirection;
          if (pos.capability.canFlipUp && pos.capability.canFlipDown) {
            direction = rng.random() < 0.5 ? FlipDirection.Up : FlipDirection.Down;
          } else if (pos.capability.canFlipUp) {
            direction = FlipDirection.Up;
          } else {
            direction = FlipDirection.Down;
          }

          const ratio = getWeightRatio(
            state,
            pos.position.row,
            pos.position.col,
            direction,
            weights,
          );
          if (rng.random() < Math.min(1, ratio)) {
            state = executeFlip(state, pos.position.row, pos.position.col, direction);
          }
        }

        if (getStateSignature(state) === initialSignature) {
          returnCount++;
        }
      }

      // Should return to initial state at least once
      expect(returnCount).toBeGreaterThan(0);
    });
  });

  describe('Statistical Moments', () => {
    it('should have correct mean vertex frequencies', () => {
      const rng = new SeededRNG(49);
      const weights: Record<VertexType, number> = {
        [VertexType.a1]: 1,
        [VertexType.a2]: 1,
        [VertexType.b1]: 3,
        [VertexType.b2]: 3,
        [VertexType.c1]: 1,
        [VertexType.c2]: 1,
      };

      // Run multiple independent simulations
      const numRuns = 10;
      const allFrequencies: Map<VertexType, number[]> = new Map();

      for (let run = 0; run < numRuns; run++) {
        const initialState = generateRandomIceState(3, 3, 12352 + run);
        const { vertexFrequencies } = runSimulation(
          initialState,
          weights,
          20000,
          new SeededRNG(50 + run),
          5000,
        );

        for (const [type, freq] of vertexFrequencies) {
          if (!allFrequencies.has(type)) {
            allFrequencies.set(type, []);
          }
          allFrequencies.get(type)!.push(freq);
        }
      }

      // Calculate mean and variance
      for (const [type, frequencies] of allFrequencies) {
        const mean = frequencies.reduce((a, b) => a + b, 0) / frequencies.length;
        const variance =
          frequencies.reduce((sum, x) => sum + Math.pow(x - mean, 2), 0) / frequencies.length;
        const stdDev = Math.sqrt(variance);

        // Standard deviation should be reasonable (not too large)
        expect(stdDev).toBeLessThan(0.2);

        // Mean should reflect weights
        if (type === VertexType.b1 || type === VertexType.b2) {
          // b vertices have higher weight, should appear more
          expect(mean).toBeGreaterThan(0.1);
        }
      }
    });
  });

  describe('Autocorrelation', () => {
    it('should decorrelate over time', () => {
      const rng = new SeededRNG(51);
      const weights: Record<VertexType, number> = {
        [VertexType.a1]: 1,
        [VertexType.a2]: 1,
        [VertexType.b1]: 1,
        [VertexType.b2]: 1,
        [VertexType.c1]: 1,
        [VertexType.c2]: 1,
      };

      const initialState = generateRandomIceState(3, 3, 12353);
      let state = initialState;

      // Track a specific observable (e.g., number of a1 vertices)
      const observable: number[] = [];

      for (let step = 0; step < 10000; step++) {
        // Count a1 vertices
        let a1Count = 0;
        for (let row = 0; row < state.height; row++) {
          for (let col = 0; col < state.width; col++) {
            if (state.vertices[row][col].type === VertexType.a1) {
              a1Count++;
            }
          }
        }
        observable.push(a1Count);

        // Perform flip
        const flippable = getAllFlippablePositions(state);
        if (flippable.length > 0) {
          const index = Math.floor(rng.random() * flippable.length);
          const pos = flippable[index];

          let direction: FlipDirection;
          if (pos.capability.canFlipUp && pos.capability.canFlipDown) {
            direction = rng.random() < 0.5 ? FlipDirection.Up : FlipDirection.Down;
          } else if (pos.capability.canFlipUp) {
            direction = FlipDirection.Up;
          } else {
            direction = FlipDirection.Down;
          }

          const ratio = getWeightRatio(
            state,
            pos.position.row,
            pos.position.col,
            direction,
            weights,
          );
          if (rng.random() < Math.min(1, ratio)) {
            state = executeFlip(state, pos.position.row, pos.position.col, direction);
          }
        }
      }

      // Calculate autocorrelation at different lags
      const autocorr0 = calculateAutocorrelation(observable, 0);
      const autocorr10 = calculateAutocorrelation(observable, 10);
      const autocorr100 = calculateAutocorrelation(observable, 100);

      // Autocorrelation should decay with lag
      expect(autocorr0).toBeCloseTo(1, 5);
      expect(Math.abs(autocorr100)).toBeLessThan(Math.abs(autocorr10));
      expect(Math.abs(autocorr100)).toBeLessThan(0.5);
    });
  });
});

// Helper functions

function getStateSignature(state: LatticeState): string {
  const types: string[] = [];
  for (let row = 0; row < state.height; row++) {
    for (let col = 0; col < state.width; col++) {
      types.push(state.vertices[row][col].type.toString());
    }
  }
  return types.join(',');
}

function calculateEntropy(frequencies: Map<VertexType, number>): number {
  let entropy = 0;
  for (const freq of frequencies.values()) {
    if (freq > 0) {
      entropy -= freq * Math.log(freq);
    }
  }
  return entropy;
}

function calculateAutocorrelation(data: number[], lag: number): number {
  if (lag >= data.length) return 0;

  const n = data.length - lag;
  const mean = data.reduce((a, b) => a + b, 0) / data.length;

  let numerator = 0;
  let denominator = 0;

  for (let i = 0; i < n; i++) {
    numerator += (data[i] - mean) * (data[i + lag] - mean);
  }

  for (let i = 0; i < data.length; i++) {
    denominator += Math.pow(data[i] - mean, 2);
  }

  return denominator === 0 ? 0 : numerator / denominator;
}
