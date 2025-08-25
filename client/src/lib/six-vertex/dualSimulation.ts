/**
 * Dual simulation manager for running two 6-vertex simulations in parallel
 * with convergence tracking based on height function similarity
 */

import { OptimizedSimulation } from './optimizedSimulation';
import { calculateHeightFunction } from './heightFunction';
import type { LatticeState, DWBCConfig } from './types';
import type { HeightData } from './heightFunction';

export interface DualSimulationConfig {
  size: number;
  temperature: number;
  weights: {
    a1: number;
    a2: number;
    b1: number;
    b2: number;
    c1: number;
    c2: number;
  };
  seedA: number;
  seedB: number;
  configA: DWBCConfig;
  configB: DWBCConfig;
}

export interface SimulationStats {
  flipAttempts: number;
  flipSuccesses: number;
  flipFailures: number;
  totalSteps: number;
  heightData: HeightData | null;
}

export interface ConvergenceMetrics {
  volumeDifference: number;
  volumeRatio: number;
  averageHeightDifference: number;
  isConverged: boolean;
  convergenceThreshold: number;
  historyLength: number;
  smoothedDifference: number;
}

export class DualSimulationManager {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private simulationA: any; // OptimizedSimulation instance
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private simulationB: any; // OptimizedSimulation instance
  private config: DualSimulationConfig;
  private convergenceHistory: number[] = [];
  private readonly HISTORY_SIZE = 100;
  private readonly CONVERGENCE_THRESHOLD = 0.05; // 5% difference threshold

  constructor(config: DualSimulationConfig) {
    this.config = config;

    // Initialize simulation A
    this.simulationA = new OptimizedSimulation({
      size: config.size,
      weights: config.weights,
      beta: 1 / config.temperature,
      seed: config.seedA,
      initialState: config.configA.type === 'high' ? 'dwbc-high' : 'dwbc-low',
    });

    // Initialize simulation B
    this.simulationB = new OptimizedSimulation({
      size: config.size,
      weights: config.weights,
      beta: 1 / config.temperature,
      seed: config.seedB,
      initialState: config.configB.type === 'high' ? 'dwbc-high' : 'dwbc-low',
    });
  }

  /**
   * Step both simulations forward
   */
  public step(stepsPerFrame: number = 100): void {
    this.simulationA.run(stepsPerFrame);
    this.simulationB.run(stepsPerFrame);
  }

  /**
   * Get the current state of simulation A
   */
  public getLatticeA(): LatticeState {
    return this.simulationA.getState();
  }

  /**
   * Get the current state of simulation B
   */
  public getLatticeB(): LatticeState {
    return this.simulationB.getState();
  }

  /**
   * Get statistics for simulation A
   */
  public getStatsA(): SimulationStats {
    const lattice = this.getLatticeA();
    const heightData = calculateHeightFunction(lattice);
    const stats = this.simulationA.getStats();

    return {
      flipAttempts: stats.flipAttempts,
      flipSuccesses: stats.successfulFlips,
      flipFailures: stats.flipAttempts - stats.successfulFlips,
      totalSteps: stats.step,
      heightData,
    };
  }

  /**
   * Get statistics for simulation B
   */
  public getStatsB(): SimulationStats {
    const lattice = this.getLatticeB();
    const heightData = calculateHeightFunction(lattice);
    const stats = this.simulationB.getStats();

    return {
      flipAttempts: stats.flipAttempts,
      flipSuccesses: stats.successfulFlips,
      flipFailures: stats.flipAttempts - stats.successfulFlips,
      totalSteps: stats.step,
      heightData,
    };
  }

  /**
   * Calculate convergence metrics between the two simulations
   */
  public getConvergenceMetrics(): ConvergenceMetrics {
    const statsA = this.getStatsA();
    const statsB = this.getStatsB();

    if (!statsA.heightData || !statsB.heightData) {
      return {
        volumeDifference: 0,
        volumeRatio: 1,
        averageHeightDifference: 0,
        isConverged: false,
        convergenceThreshold: this.CONVERGENCE_THRESHOLD,
        historyLength: 0,
        smoothedDifference: 0,
      };
    }

    const volumeA = statsA.heightData.totalVolume;
    const volumeB = statsB.heightData.totalVolume;
    const avgHeightA = statsA.heightData.averageHeight;
    const avgHeightB = statsB.heightData.averageHeight;

    // Calculate metrics
    const volumeDifference = Math.abs(volumeA - volumeB);
    const volumeRatio = Math.min(volumeA, volumeB) / Math.max(volumeA, volumeB);
    const averageHeightDifference = Math.abs(avgHeightA - avgHeightB);

    // Normalized difference (0 to 1)
    const normalizedDiff = volumeDifference / Math.max(volumeA, volumeB);

    // Update history
    this.convergenceHistory.push(normalizedDiff);
    if (this.convergenceHistory.length > this.HISTORY_SIZE) {
      this.convergenceHistory.shift();
    }

    // Calculate smoothed difference (moving average)
    const smoothedDifference =
      this.convergenceHistory.length > 0
        ? this.convergenceHistory.reduce((a, b) => a + b, 0) / this.convergenceHistory.length
        : normalizedDiff;

    // Check convergence: volume ratio close to 1 and stable
    const isConverged =
      volumeRatio > 1 - this.CONVERGENCE_THRESHOLD &&
      smoothedDifference < this.CONVERGENCE_THRESHOLD &&
      this.convergenceHistory.length >= 20; // Need enough history

    return {
      volumeDifference,
      volumeRatio,
      averageHeightDifference,
      isConverged,
      convergenceThreshold: this.CONVERGENCE_THRESHOLD,
      historyLength: this.convergenceHistory.length,
      smoothedDifference,
    };
  }

  /**
   * Update weights for both simulations
   */
  public updateWeights(newWeights: {
    a1: number;
    a2: number;
    b1: number;
    b2: number;
    c1: number;
    c2: number;
  }): void {
    this.simulationA.updateWeights(newWeights);
    this.simulationB.updateWeights(newWeights);
    this.config.weights = newWeights;
  }

  /**
   * Update temperature for both simulations
   * Note: OptimizedSimulation doesn't support temperature updates,
   * so we need to recreate the simulations
   */
  public updateTemperature(temperature: number): void {
    this.config.temperature = temperature;
    // Recreate simulations with new temperature
    this.reset();
  }

  /**
   * Reset both simulations with new configurations
   */
  public reset(configA?: DWBCConfig, configB?: DWBCConfig): void {
    if (configA) {
      this.config.configA = configA;
    }
    if (configB) {
      this.config.configB = configB;
    }

    // Reset simulation A
    this.simulationA = new OptimizedSimulation({
      size: this.config.size,
      weights: this.config.weights,
      beta: 1 / this.config.temperature,
      seed: this.config.seedA,
      initialState: this.config.configA.type === 'high' ? 'dwbc-high' : 'dwbc-low',
    });

    // Reset simulation B
    this.simulationB = new OptimizedSimulation({
      size: this.config.size,
      weights: this.config.weights,
      beta: 1 / this.config.temperature,
      seed: this.config.seedB,
      initialState: this.config.configB.type === 'high' ? 'dwbc-high' : 'dwbc-low',
    });

    // Clear convergence history
    this.convergenceHistory = [];
  }

  /**
   * Get convergence history for visualization
   */
  public getConvergenceHistory(): number[] {
    return [...this.convergenceHistory];
  }

  /**
   * Check if both simulations have reached equilibrium
   * (based on flip success rate stability)
   */
  public isEquilibrated(): boolean {
    // Simple check: both simulations have reasonable flip success rates
    const statsA = this.simulationA.getStats();
    const statsB = this.simulationB.getStats();

    const successRateA = statsA.acceptanceRate;
    const successRateB = statsB.acceptanceRate;

    // Typical equilibrium success rates are between 0.3 and 0.7
    return (
      successRateA > 0.2 &&
      successRateA < 0.8 &&
      successRateB > 0.2 &&
      successRateB < 0.8 &&
      statsA.step > 1000 &&
      statsB.step > 1000
    );
  }
}
