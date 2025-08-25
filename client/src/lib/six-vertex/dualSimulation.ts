/**
 * Dual simulation manager for running two 6-vertex simulations in parallel
 * with convergence tracking based on height function similarity
 */

import { OptimizedLatticeSimulation } from './optimizedSimulation';
import { generateDWBCState } from './initialStates';
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
  private simulationA: OptimizedLatticeSimulation;
  private simulationB: OptimizedLatticeSimulation;
  private config: DualSimulationConfig;
  private convergenceHistory: number[] = [];
  private readonly HISTORY_SIZE = 100;
  private readonly CONVERGENCE_THRESHOLD = 0.05; // 5% difference threshold

  constructor(config: DualSimulationConfig) {
    this.config = config;

    // Initialize simulation A
    const latticeA = generateDWBCState(config.size, config.size, config.configA);
    this.simulationA = new OptimizedLatticeSimulation(
      latticeA,
      config.temperature,
      config.weights,
      config.seedA,
    );

    // Initialize simulation B
    const latticeB = generateDWBCState(config.size, config.size, config.configB);
    this.simulationB = new OptimizedLatticeSimulation(
      latticeB,
      config.temperature,
      config.weights,
      config.seedB,
    );
  }

  /**
   * Step both simulations forward
   */
  public step(stepsPerFrame: number = 100): void {
    this.simulationA.step(stepsPerFrame);
    this.simulationB.step(stepsPerFrame);
  }

  /**
   * Get the current state of simulation A
   */
  public getLatticeA(): LatticeState {
    return this.simulationA.getCurrentState();
  }

  /**
   * Get the current state of simulation B
   */
  public getLatticeB(): LatticeState {
    return this.simulationB.getCurrentState();
  }

  /**
   * Get statistics for simulation A
   */
  public getStatsA(): SimulationStats {
    const lattice = this.getLatticeA();
    const heightData = calculateHeightFunction(lattice);

    return {
      flipAttempts: this.simulationA.getFlipAttempts(),
      flipSuccesses: this.simulationA.getFlipSuccesses(),
      flipFailures: this.simulationA.getFlipFailures(),
      totalSteps: this.simulationA.getStepCount(),
      heightData,
    };
  }

  /**
   * Get statistics for simulation B
   */
  public getStatsB(): SimulationStats {
    const lattice = this.getLatticeB();
    const heightData = calculateHeightFunction(lattice);

    return {
      flipAttempts: this.simulationB.getFlipAttempts(),
      flipSuccesses: this.simulationB.getFlipSuccesses(),
      flipFailures: this.simulationB.getFlipFailures(),
      totalSteps: this.simulationB.getStepCount(),
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
   */
  public updateTemperature(temperature: number): void {
    this.simulationA.updateTemperature(temperature);
    this.simulationB.updateTemperature(temperature);
    this.config.temperature = temperature;
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
    const latticeA = generateDWBCState(this.config.size, this.config.size, this.config.configA);
    this.simulationA = new OptimizedLatticeSimulation(
      latticeA,
      this.config.temperature,
      this.config.weights,
      this.config.seedA,
    );

    // Reset simulation B
    const latticeB = generateDWBCState(this.config.size, this.config.size, this.config.configB);
    this.simulationB = new OptimizedLatticeSimulation(
      latticeB,
      this.config.temperature,
      this.config.weights,
      this.config.seedB,
    );

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
    const successRateA =
      this.simulationA.getFlipSuccesses() / Math.max(1, this.simulationA.getFlipAttempts());
    const successRateB =
      this.simulationB.getFlipSuccesses() / Math.max(1, this.simulationB.getFlipAttempts());

    // Typical equilibrium success rates are between 0.3 and 0.7
    return (
      successRateA > 0.2 &&
      successRateA < 0.8 &&
      successRateB > 0.2 &&
      successRateB < 0.8 &&
      this.simulationA.getStepCount() > 1000 &&
      this.simulationB.getStepCount() > 1000
    );
  }
}
