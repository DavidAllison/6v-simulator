/**
 * Monte Carlo simulation engine for the 6-vertex model
 * Implements Metropolis-Hastings algorithm with local updates
 *
 * This module provides a compatibility layer that uses the optimized
 * simulation engine for better performance while maintaining the same API
 */

import type {
  LatticeState,
  SimulationParams,
  SimulationStats,
  SimulationController,
  SimulationEvents,
  Position,
} from './types';
import { VertexType, BoundaryCondition } from './types';
import { SeededRNG } from './rng';
import {
  findValidFlips,
  executeFlip,
  calculateFlipEnergyChange,
  getAllPossibleFlips,
} from './flips';
import { generateDWBCState, generateRandomIceState } from './initialStates';
import { OptimizedPhysicsSimulation } from './optimizedSimulation';
import {
  WorkerSimulation,
  createWorkerSimulation,
  isWorkerSupported,
} from './worker/workerInterface';

/**
 * Configuration for simulation mode
 */
export interface SimulationConfig {
  useOptimized?: boolean; // Use optimized implementation
  useWorker?: boolean; // Use Web Worker for large simulations
  workerThreshold?: number; // Size threshold for automatic worker usage (default: 50)
}

/**
 * Main simulation engine implementation with automatic optimization
 */
export class MonteCarloSimulation implements SimulationController {
  private state: LatticeState | null = null;
  private params: SimulationParams;
  private rng: SeededRNG;
  private stats: SimulationStats;
  private isRunningFlag = false;
  private isPaused = false;
  private eventHandlers: Map<keyof SimulationEvents, Set<Function>> = new Map();
  private animationFrame: number | null = null;

  // Optimization support
  private config: SimulationConfig;
  private optimizedSim: OptimizedPhysicsSimulation | null = null;
  private workerSim: WorkerSimulation | null = null;
  private useOptimized = false;
  private useWorker = false;

  constructor(params?: Partial<SimulationParams>, config?: SimulationConfig) {
    this.params = this.getDefaultParams(params);
    this.rng = new SeededRNG(this.params.seed);
    this.stats = this.getInitialStats();
    this.config = {
      useOptimized: config?.useOptimized !== false, // Default to true
      useWorker: config?.useWorker || false,
      workerThreshold: config?.workerThreshold || 50,
    };

    // Initialize event handler sets
    for (const event of ['onStep', 'onFlip', 'onStateChange', 'onError'] as const) {
      this.eventHandlers.set(event, new Set());
    }
  }

  /**
   * Get default simulation parameters
   */
  private getDefaultParams(overrides?: Partial<SimulationParams>): SimulationParams {
    const defaultWeights = {
      a1: 1.0,
      a2: 1.0,
      b1: 1.0,
      b2: 1.0,
      c1: 1.0,
      c2: 1.0,
    };

    return {
      temperature: 1.0,
      beta: 1.0,
      weights: { ...defaultWeights, ...overrides?.weights },
      boundaryCondition: overrides?.boundaryCondition || BoundaryCondition.Periodic,
      dwbcConfig: overrides?.dwbcConfig,
      seed: overrides?.seed || Date.now(),
      ...overrides,
    };
  }

  /**
   * Get initial statistics
   */
  private getInitialStats(): SimulationStats {
    return {
      step: 0,
      energy: 0,
      vertexCounts: {
        [VertexType.a1]: 0,
        [VertexType.a2]: 0,
        [VertexType.b1]: 0,
        [VertexType.b2]: 0,
        [VertexType.c1]: 0,
        [VertexType.c2]: 0,
      },
      acceptanceRate: 0,
      flipAttempts: 0,
      successfulFlips: 0,
      beta: this.params?.beta || 1.0,
    };
  }

  /**
   * Initialize the lattice
   */
  initialize(width: number, height: number, params: SimulationParams): void {
    this.params = params;
    this.rng.setSeed(params.seed || Date.now());

    // Determine which implementation to use based on size
    const size = Math.min(width, height);
    this.useOptimized = (this.config.useOptimized ?? true) && size > 8;
    this.useWorker =
      this.config.useWorker ?? (size >= (this.config.workerThreshold ?? 50) && isWorkerSupported());

    // Initialize optimized simulation if needed
    if (this.useOptimized && !this.useWorker) {
      this.optimizedSim = new OptimizedPhysicsSimulation({
        size,
        weights: params.weights || {
          a1: 1.0,
          a2: 1.0,
          b1: 1.0,
          b2: 1.0,
          c1: 1.0,
          c2: 1.0,
        },
        seed: params.seed,
        batchSize: size <= 24 ? 100 : size <= 50 ? 50 : 20,
        initialState: params.dwbcConfig?.type === 'low' ? 'dwbc-low' : 'dwbc-high',
      });
      this.state = this.optimizedSim.getState();
    }
    // Initialize worker if needed
    else if (this.useWorker) {
      try {
        createWorkerSimulation(
          {
            size,
            weights: params.weights || {
              a1: 1.0,
              a2: 1.0,
              b1: 1.0,
              b2: 1.0,
              c1: 1.0,
              c2: 1.0,
            },
            seed: params.seed,
            batchSize: size <= 50 ? 100 : 50,
            initialState: params.dwbcConfig?.type === 'low' ? 'dwbc-low' : 'dwbc-high',
          },
          {
            onStats: (stats) => {
              this.stats = stats;
              this.emit('onStep', stats);
            },
            onState: (state) => {
              this.state = state;
              this.emit('onStateChange', state);
            },
          },
        )
          .then((workerSim) => {
            this.workerSim = workerSim;
            // Request initial state
            if (this.workerSim) {
              this.workerSim.getState();
            }
          })
          .catch((error) => {
            console.warn(
              'Failed to create worker, falling back to optimized implementation',
              error,
            );
            this.useWorker = false;
            this.useOptimized = true;
            // Fall back to optimized implementation
            this.initializeOptimized(size, params);
          });
      } catch (error) {
        console.warn('Worker creation failed', error);
        this.initializeOptimized(size, params);
      }
    } else {
      // Generate initial state without optimization
      this.generateInitialState(width, height, params);
    }

    // Update statistics
    this.updateStats();
  }

  private initializeOptimized(size: number, params: SimulationParams): void {
    this.optimizedSim = new OptimizedPhysicsSimulation({
      size,
      weights: params.weights || {
        a1: 1.0,
        a2: 1.0,
        b1: 1.0,
        b2: 1.0,
        c1: 1.0,
        c2: 1.0,
      },
      seed: params.seed,
      batchSize: size <= 24 ? 100 : size <= 50 ? 50 : 20,
      initialState: params.dwbcConfig?.type === 'low' ? 'dwbc-low' : 'dwbc-high',
    });
    this.state = this.optimizedSim.getState();
  }

  private generateInitialState(width: number, height: number, params: SimulationParams): void {
    // Generate initial state based on boundary conditions
    if (params.boundaryCondition === BoundaryCondition.DWBC && params.dwbcConfig) {
      this.state = generateDWBCState(width, height, params.dwbcConfig);
    } else {
      this.state = generateRandomIceState(width, height, params.seed);
    }
  }

  private updateStats(): void {
    if (this.state) {
      this.updateStatistics();
      this.emit('onStateChange', this.state);
    }
  }

  /**
   * Reset the simulation
   */
  reset(): void {
    if (!this.state) return;

    const { width, height } = this.state;
    this.initialize(width, height, this.params);
  }

  /**
   * Get current lattice state
   */
  getState(): LatticeState {
    if (!this.state) {
      throw new Error('Simulation not initialized');
    }
    return this.state;
  }

  /**
   * Set lattice state
   */
  setState(state: LatticeState): void {
    this.state = state;
    this.updateStatistics();
    this.emit('onStateChange', state);
  }

  /**
   * Perform a single Monte Carlo step
   */
  step(): void {
    if (!this.state) {
      console.error('Simulation not initialized - cannot step');
      return; // Don't throw, just return silently
    }

    try {
      // Use optimized implementation if available
      if (this.optimizedSim) {
        this.optimizedSim.run(1);
        this.state = this.optimizedSim.getState();
        this.stats = this.optimizedSim.getStats();
        if (this.state) {
          this.emit('onStateChange', this.state);
        }
        this.emit('onStep', this.stats);
        return;
      }
    } catch (error) {
      console.error('Error in optimized simulation step:', error);
      // Try to recover or fallback
      this.emit('onError', error as Error);
      return;
    }

    // Use worker if available
    if (this.workerSim) {
      this.workerSim.run(1);
      return; // Stats and state updates handled by callbacks
    }

    // Original implementation
    // Choose a random position
    const row = this.rng.randomInt(0, this.state.height);
    const col = this.rng.randomInt(0, this.state.width);
    const position: Position = { row, col };

    // Find valid flips at this position
    const flips = findValidFlips(this.state, position);

    if (flips.length === 0) {
      this.stats.flipAttempts++;
      return;
    }

    // Choose a random flip
    const flip = this.rng.choice(flips);

    // Calculate energy change
    const deltaE = calculateFlipEnergyChange(this.state, flip, this.params.weights);

    // Metropolis acceptance criterion
    const acceptProbability = Math.min(1, Math.exp(-this.params.beta * deltaE));

    this.stats.flipAttempts++;

    if (this.rng.random() < acceptProbability) {
      // Accept the flip
      if (this.state) {
        this.state = executeFlip(this.state, flip);
      }
      this.stats.successfulFlips++;
      this.emit('onFlip', flip);
      this.emit('onStateChange', this.state);
    }

    this.stats.step++;
    this.updateStatistics();
    this.emit('onStep', this.stats);
  }

  /**
   * Run simulation for a specified number of steps
   */
  async run(steps: number): Promise<void> {
    if (!this.state) {
      throw new Error('Simulation not initialized');
    }

    this.isRunningFlag = true;
    this.isPaused = false;

    // Use optimized batch processing if available
    if (this.optimizedSim) {
      const batchSize = this.state.width <= 24 ? 1000 : this.state.width <= 50 ? 500 : 100;
      let remaining = steps;

      while (remaining > 0 && this.isRunningFlag && !this.isPaused) {
        const batch = Math.min(batchSize, remaining);
        this.optimizedSim.run(batch);
        this.state = this.optimizedSim.getState();
        this.stats = this.optimizedSim.getStats();
        if (this.state) {
          this.emit('onStateChange', this.state);
        }
        this.emit('onStep', this.stats);

        remaining -= batch;

        // Allow UI to update
        if (remaining > 0) {
          await new Promise((resolve) => setTimeout(resolve, 0));
        }
      }
    }
    // Use worker if available
    else if (this.workerSim) {
      this.workerSim.run(steps);
      // Wait for completion (handled by callbacks)
      await new Promise((resolve) => {
        const checkComplete = () => {
          if (this.stats.step >= steps || !this.isRunningFlag) {
            resolve(undefined);
          } else {
            setTimeout(checkComplete, 100);
          }
        };
        checkComplete();
      });
    }
    // Original implementation
    else {
      const batchSize = 100; // Process in batches for responsiveness
      let remaining = steps;

      while (remaining > 0 && this.isRunningFlag && !this.isPaused) {
        const batch = Math.min(batchSize, remaining);

        for (let i = 0; i < batch; i++) {
          if (!this.isRunningFlag || this.isPaused) break;
          this.step();
        }

        remaining -= batch;

        // Allow UI to update
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    }

    this.isRunningFlag = false;
  }

  /**
   * Pause the simulation
   */
  pause(): void {
    this.isPaused = true;
  }

  /**
   * Resume the simulation
   */
  resume(): void {
    this.isPaused = false;
  }

  /**
   * Check if simulation is running
   */
  isRunning(): boolean {
    return this.isRunningFlag && !this.isPaused;
  }

  /**
   * Update simulation parameters
   */
  updateParams(params: Partial<SimulationParams>): void {
    this.params = { ...this.params, ...params };

    if (params.seed !== undefined) {
      this.rng.setSeed(params.seed);
    }

    if (params.temperature !== undefined) {
      this.params.beta = 1.0 / params.temperature;
    }

    // Update weights in optimized simulation without resetting
    if (params.weights && this.optimizedSim) {
      this.optimizedSim.updateWeights(params.weights);
    }
  }

  /**
   * Get current parameters
   */
  getParams(): SimulationParams {
    return { ...this.params };
  }

  /**
   * Get current statistics
   */
  getStats(): SimulationStats {
    return { ...this.stats };
  }

  /**
   * Update statistics based on current state
   */
  private updateStatistics(): void {
    if (!this.state) return;

    // Reset vertex counts
    for (const type of Object.values(VertexType)) {
      this.stats.vertexCounts[type] = 0;
    }

    // Count vertices and calculate energy
    let energy = 0;

    for (let row = 0; row < this.state.height; row++) {
      for (let col = 0; col < this.state.width; col++) {
        const vertex = this.state.vertices[row][col];
        this.stats.vertexCounts[vertex.type]++;
        energy += -Math.log(this.params.weights[vertex.type]);
      }
    }

    this.stats.energy = energy;

    // Update acceptance rate
    if (this.stats.flipAttempts > 0) {
      this.stats.acceptanceRate = this.stats.successfulFlips / this.stats.flipAttempts;
    }
  }

  /**
   * Event handling
   */
  on<K extends keyof SimulationEvents>(event: K, handler: SimulationEvents[K]): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.add(handler as Function);
    }
  }

  off<K extends keyof SimulationEvents>(event: K, handler: SimulationEvents[K]): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.delete(handler as Function);
    }
  }

  private emit<K extends keyof SimulationEvents>(
    event: K,
    ...args: Parameters<SimulationEvents[K]>
  ): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          (handler as Function)(...args);
        } catch (error) {
          console.error(`Error in event handler for ${event}:`, error);
          if (event !== 'onError') {
            this.emit('onError', error as Error);
          }
        }
      });
    }
  }

  /**
   * Advanced simulation methods
   */

  /**
   * Perform parallel tempering with multiple replicas
   */
  async parallelTempering(
    temperatures: number[],
    stepsPerSwap: number,
    totalSwaps: number,
  ): Promise<void> {
    // Implementation for parallel tempering
    // This is a placeholder for advanced sampling
    throw new Error('Parallel tempering not yet implemented');
  }

  /**
   * Calculate correlation functions
   */
  calculateCorrelations(): Record<string, number[]> {
    if (!this.state) {
      throw new Error('Simulation not initialized');
    }

    // Placeholder for correlation function calculations
    return {};
  }

  /**
   * Export simulation data for analysis
   */
  exportData(): {
    params: SimulationParams;
    stats: SimulationStats;
    state: LatticeState;
  } {
    if (!this.state) {
      throw new Error('Simulation not initialized');
    }

    return {
      params: this.getParams(),
      stats: this.getStats(),
      state: this.getState(),
    };
  }

  /**
   * Import simulation data from a saved state
   */
  importData(data: {
    params: SimulationParams;
    stats: SimulationStats;
    state: LatticeState;
  }): void {
    // Set the state
    this.state = data.state;

    // Update parameters
    this.params = data.params;
    this.rng.setSeed(data.params.seed || Date.now());

    // Update statistics
    this.stats = data.stats;

    // Reinitialize optimized simulation if needed
    const size = Math.min(data.state.width, data.state.height);
    this.useOptimized = (this.config.useOptimized ?? true) && size > 8;

    if (this.useOptimized && !this.useWorker) {
      // Recreate optimized simulation with the imported state
      this.optimizedSim = new OptimizedPhysicsSimulation({
        size,
        weights: data.params.weights,
        seed: data.params.seed,
        batchSize: size <= 24 ? 100 : size <= 50 ? 50 : 20,
        initialState: data.params.dwbcConfig?.type === 'low' ? 'dwbc-low' : 'dwbc-high',
      });

      // Set the imported state in the optimized simulation
      if (this.optimizedSim) {
        // Note: The optimized simulation may need a setState method
        // For now, we'll just use the imported state directly
        this.state = data.state;
      }
    }

    // Emit state change event
    this.emit('onStateChange', this.state);
    this.emit('onStep', this.stats);
  }
}

/**
 * Create a new simulation instance
 */
export function createSimulation(
  params?: Partial<SimulationParams>,
  config?: SimulationConfig,
): SimulationController {
  return new MonteCarloSimulation(params, config);
}
