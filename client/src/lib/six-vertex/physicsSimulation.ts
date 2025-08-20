/**
 * Physics-accurate Monte Carlo simulation for the 6-vertex model
 * Implements the heat-bath algorithm from the paper
 */

import type { LatticeState, SimulationParams, SimulationStats } from './types';
import { VertexType } from './types';
import { SeededRNG } from './rng';
import {
  isFlippable,
  executeFlip,
  getWeightRatio,
  getAllFlippablePositions,
  calculateHeight,
  FlipDirection,
} from './physicsFlips';
import { generateDWBCHigh, generateDWBCLow } from './initialStates';

/**
 * Physics simulation configuration
 */
export interface PhysicsSimConfig {
  size: number;
  weights: {
    a1: number;
    a2: number;
    b1: number;
    b2: number;
    c1: number;
    c2: number;
  };
  rho?: number; // Scaling factor for acceptance probability
  seed?: number;
  initialState?: 'dwbc-high' | 'dwbc-low' | 'custom';
}

/**
 * Physics-based simulation controller
 */
export class PhysicsSimulation {
  private state: LatticeState;
  private config: PhysicsSimConfig;
  private rng: SeededRNG;
  private step: number = 0;
  private successfulFlips: number = 0;
  private attemptedFlips: number = 0;
  private currentHeight: number = 0;
  private rho: number;

  constructor(config: PhysicsSimConfig) {
    this.config = config;
    this.rng = new SeededRNG(config.seed);

    // Initialize state
    if (config.initialState === 'dwbc-low') {
      this.state = generateDWBCLow(config.size);
    } else {
      this.state = generateDWBCHigh(config.size);
    }

    this.currentHeight = calculateHeight(this.state);

    // Calculate rho (scaling factor) if not provided
    if (config.rho) {
      this.rho = config.rho;
    } else {
      this.rho = this.calculateRho();
    }
  }

  /**
   * Calculate the optimal rho value (port of definerho from main.c)
   * rho = 1 / max(weight combinations for all flip types)
   */
  private calculateRho(): number {
    const weights = this.config.weights;
    let maxWeight = 0;

    // Check all possible 2x2 configurations and their weight products
    const vertexTypes = [
      VertexType.a1,
      VertexType.a2,
      VertexType.b1,
      VertexType.b2,
      VertexType.c1,
      VertexType.c2,
    ];

    // For each possible 2x2 configuration
    for (const v1 of vertexTypes) {
      for (const v2 of vertexTypes) {
        for (const v3 of vertexTypes) {
          for (const v4 of vertexTypes) {
            const weight = weights[v1] * weights[v2] * weights[v3] * weights[v4];
            if (weight > maxWeight) {
              maxWeight = weight;
            }
          }
        }
      }
    }

    return 1.0 / maxWeight;
  }

  /**
   * Perform one Monte Carlo step
   */
  public performStep(): void {
    // Get a random position
    const row = this.rng.randomInt(0, this.state.height);
    const col = this.rng.randomInt(0, this.state.width);

    // Check if it's flippable
    const capability = isFlippable(this.state, row, col);

    if (!capability.canFlipUp && !capability.canFlipDown) {
      // Position not flippable, skip
      return;
    }

    this.attemptedFlips++;

    // Handle different flip scenarios
    if (capability.canFlipUp && !capability.canFlipDown) {
      // Can only flip up
      this.tryFlip(row, col, FlipDirection.Up);
    } else if (!capability.canFlipUp && capability.canFlipDown) {
      // Can only flip down
      this.tryFlip(row, col, FlipDirection.Down);
    } else {
      // Can flip both ways (biflip)
      this.tryBiflip(row, col);
    }

    this.step++;
  }

  /**
   * Try to execute a single-direction flip
   */
  private tryFlip(row: number, col: number, direction: FlipDirection): void {
    const weightRatio = getWeightRatio(this.state, row, col, direction, this.config.weights);
    const acceptanceProbability = this.rho * weightRatio;

    if (this.rng.random() < acceptanceProbability) {
      // Accept the flip
      this.state = executeFlip(this.state, row, col, direction);
      this.successfulFlips++;

      // Update height
      if (direction === FlipDirection.Up) {
        this.currentHeight--;
      } else {
        this.currentHeight++;
      }
    }
  }

  /**
   * Try to execute a biflip (can go either up or down)
   */
  private tryBiflip(row: number, col: number): void {
    const upRatio = getWeightRatio(this.state, row, col, FlipDirection.Up, this.config.weights);
    const downRatio = getWeightRatio(this.state, row, col, FlipDirection.Down, this.config.weights);

    const upProbability = this.rho * upRatio;
    const downProbability = this.rho * downRatio;

    const random = this.rng.random();

    if (random < upProbability) {
      // Accept up flip
      this.state = executeFlip(this.state, row, col, FlipDirection.Up);
      this.successfulFlips++;
      this.currentHeight--;
    } else if (random < upProbability + downProbability) {
      // Accept down flip
      this.state = executeFlip(this.state, row, col, FlipDirection.Down);
      this.successfulFlips++;
      this.currentHeight++;
    }
    // else: reject both flips
  }

  /**
   * Run multiple Monte Carlo steps
   */
  public run(steps: number): void {
    for (let i = 0; i < steps; i++) {
      this.performStep();
    }
  }

  /**
   * Get current state
   */
  public getState(): LatticeState {
    return this.state;
  }

  /**
   * Get simulation statistics
   */
  public getStats(): SimulationStats {
    // Count vertex types
    const vertexCounts: Record<VertexType, number> = {
      [VertexType.a1]: 0,
      [VertexType.a2]: 0,
      [VertexType.b1]: 0,
      [VertexType.b2]: 0,
      [VertexType.c1]: 0,
      [VertexType.c2]: 0,
    };

    for (let row = 0; row < this.state.height; row++) {
      for (let col = 0; col < this.state.width; col++) {
        const type = this.state.vertices[row][col].type;
        vertexCounts[type]++;
      }
    }

    // Calculate energy (negative log of probability)
    let energy = 0;
    for (const [type, count] of Object.entries(vertexCounts)) {
      energy -= count * Math.log(this.config.weights[type as VertexType]);
    }

    const acceptanceRate = this.attemptedFlips > 0 ? this.successfulFlips / this.attemptedFlips : 0;

    return {
      step: this.step,
      energy,
      vertexCounts,
      acceptanceRate,
      flipAttempts: this.attemptedFlips,
      successfulFlips: this.successfulFlips,
      beta: 1.0 / (this.config.weights.a1 + this.config.weights.a2), // approximation
      height: this.currentHeight,
    };
  }

  /**
   * Get current height/volume
   */
  public getHeight(): number {
    return this.currentHeight;
  }

  /**
   * Reset simulation to initial state
   */
  public reset(): void {
    this.step = 0;
    this.successfulFlips = 0;
    this.attemptedFlips = 0;

    if (this.config.initialState === 'dwbc-low') {
      this.state = generateDWBCLow(this.config.size);
    } else {
      this.state = generateDWBCHigh(this.config.size);
    }

    this.currentHeight = calculateHeight(this.state);
  }

  /**
   * Set a custom state
   */
  public setState(state: LatticeState): void {
    this.state = state;
    this.currentHeight = calculateHeight(state);
  }

  /**
   * Get list of all flippable positions
   */
  public getFlippablePositions(): Array<{
    row: number;
    col: number;
    canFlipUp: boolean;
    canFlipDown: boolean;
  }> {
    const positions = [];

    for (let row = 0; row < this.state.height; row++) {
      for (let col = 0; col < this.state.width; col++) {
        const capability = isFlippable(this.state, row, col);
        if (capability.canFlipUp || capability.canFlipDown) {
          positions.push({
            row,
            col,
            canFlipUp: capability.canFlipUp,
            canFlipDown: capability.canFlipDown,
          });
        }
      }
    }

    return positions;
  }
}
