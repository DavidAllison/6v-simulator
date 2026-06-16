/**
 * Monte Carlo simulation engine for the 6-vertex model
 * Implements Metropolis-Hastings algorithm with local updates
 *
 * This module provides a compatibility layer that uses the optimized
 * simulation engine for better performance while maintaining the same API
 */

import type {
  LatticeState,
  RawLatticeState,
  SimulationParams,
  SimulationStats,
  SimulationController,
  SimulationEvents,
  Position,
  Vertex,
} from './types';
import { VertexType, BoundaryCondition, getVertexConfiguration } from './types';
import { SeededRNG } from './rng';
import { findValidFlips, executeFlip, calculateFlipEnergyChange } from './flips';
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
 * Above this linear size (N), the facade stops rebuilding the object LatticeState
 * (~N*N Vertex objects) on every step and instead exposes a compact typed-array
 * snapshot via getRawState(). Callers render large lattices from the raw buffer;
 * the object form is rebuilt lazily only if getState() is actually called.
 */
export const LARGE_LATTICE_THRESHOLD = 128;

/**
 * Main simulation engine implementation with automatic optimization
 */
export class MonteCarloSimulation implements SimulationController {
  private state: LatticeState | null = null;
  // For large lattices the object state is rebuilt lazily; this marks it stale.
  private stateDirty = false;
  // Lattice dimensions, tracked separately so reset() works even when the object
  // state is null (large lattices defer building it).
  private dims: { width: number; height: number } | null = null;
  private params: SimulationParams;
  private rng: SeededRNG;
  private stats: SimulationStats;
  private isRunningFlag = false;
  private isPaused = false;
  private eventHandlers: Map<keyof SimulationEvents, Set<(...args: unknown[]) => unknown>> =
    new Map();
  private animationFrame: number | null = null;

  // Optimization support
  private config: SimulationConfig;
  private optimizedSim: OptimizedPhysicsSimulation | null = null;
  private workerSim: WorkerSimulation | null = null;
  private useOptimized = false;
  private useWorker = false;

  // Worker async-cache model: the worker engine is the source of truth in worker
  // mode, but the facade's getStats()/getRawState() are synchronous. We cache the
  // latest snapshots pushed by the worker (via callbacks) and serve them from the
  // cache. getState() returns null in worker mode (consumers use the raw path).
  private workerActive = false;
  private latestRawState: RawLatticeState | null = null;
  // Set when run() is called before the (async) worker has finished initializing.
  // The worker starts its continuous loop as soon as it becomes ready.
  private pendingRun = false;

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
    this.dims = { width, height };

    // Determine which implementation to use based on size
    const size = Math.min(width, height);
    this.useOptimized = (this.config.useOptimized ?? true) && size > 8;
    // Only offload to a Web Worker for LARGE lattices, and only when the caller
    // opted in and workers are actually supported. Small lattices stay fully
    // synchronous on the main thread so step-by-step debugging and the object
    // renderer keep working. The MC loop blocks the UI thread only for big N,
    // which is exactly the case the worker exists to fix.
    this.useWorker =
      (this.config.useWorker ?? false) && size > LARGE_LATTICE_THRESHOLD && isWorkerSupported();
    this.workerActive = false;
    this.workerSim = null;
    this.latestRawState = null;

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
      this.adoptOptimizedState();
    }
    // Initialize worker if needed
    else if (this.useWorker) {
      try {
        createWorkerSimulation(
          {
            // Same config the main-thread optimized engine would use, so the
            // worker reproduces the identical trajectory for a given seed.
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
          },
          {
            onStats: (stats) => {
              this.stats = stats as SimulationStats;
              this.emit('onStep', this.stats);
            },
            // Worker pushes a compact typed-array snapshot; cache it and emit
            // onStateChange so the large-aware UI handler pulls via getRawState().
            onRawState: (vertices, width, height) => {
              this.latestRawState = { width, height, vertices };
              // The object payload is unused for large worker mode; emit an empty
              // sentinel and let the handler read getRawState().
              this.emit('onStateChange', this.state as unknown as LatticeState);
            },
            onError: (error) => {
              this.emit('onError', new Error(error));
            },
          },
        )
          .then((workerSim) => {
            if (workerSim) {
              this.workerSim = workerSim;
              this.workerActive = true;
              // Request an initial snapshot + stats to seed the cache.
              workerSim.getRawState();
              workerSim.getStats();
              // If the user pressed Run before the worker finished initializing,
              // honour that intent now (unless they paused/stopped in between).
              if (this.pendingRun && this.isRunningFlag && !this.isPaused) {
                workerSim.startContinuous(60);
              }
              this.pendingRun = false;
            } else {
              // Worker unavailable (e.g. test/build env): fall back cleanly.
              this.fallBackToOptimized(size, params);
            }
          })
          .catch((error) => {
            console.warn(
              'Failed to create worker, falling back to optimized implementation',
              error,
            );
            this.fallBackToOptimized(size, params);
          });
      } catch (error) {
        console.warn('Worker creation failed', error);
        this.fallBackToOptimized(size, params);
      }
    } else {
      // Generate initial state without optimization
      this.generateInitialState(width, height, params);
    }

    // Update statistics
    this.updateStats();
  }

  /**
   * Fall back to the main-thread optimized engine when the worker cannot be used
   * (unsupported, init failed, or test/build env). Fully initializes the engine
   * and seeds the UI with an initial state + stats so nothing renders blank.
   */
  private fallBackToOptimized(size: number, params: SimulationParams): void {
    this.useWorker = false;
    this.workerActive = false;
    this.workerSim = null;
    this.latestRawState = null;
    this.useOptimized = true;

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
    this.adoptOptimizedState();

    // Seed the UI: large lattices render from the raw snapshot, others from the
    // object form. updateStats() emits onStep, and (for small N) onStateChange.
    this.stats = this.optimizedSim.getStats();
    if (this.isLargeLattice()) {
      this.emit('onStep', this.stats);
      this.emit('onStateChange', this.state as unknown as LatticeState);
    } else if (this.state) {
      this.emit('onStateChange', this.state);
      this.emit('onStep', this.stats);
    }
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
    // Large lattices: emit stats only (no object payload); callers pull raw state.
    if (this.isLargeLattice() && this.optimizedSim) {
      this.stats = this.optimizedSim.getStats();
      this.emit('onStep', this.stats);
      return;
    }
    if (this.state) {
      this.updateStatistics();
      this.emit('onStateChange', this.state);
    }
  }

  /**
   * Reset the simulation
   */
  reset(): void {
    if (!this.dims) return;

    // Tear down any existing worker so initialize() can spin up a fresh one with
    // the same seed (which reproduces the trajectory) without leaking the old.
    if (this.workerSim) {
      this.workerSim.stop();
      this.workerSim.terminate();
      this.workerSim = null;
      this.workerActive = false;
    }

    const { width, height } = this.dims;
    this.initialize(width, height, this.params);
  }

  /**
   * Release background resources. Terminates the Web Worker (if any) so it does
   * not leak when this controller is discarded (e.g. on re-init for a new size).
   */
  dispose(): void {
    this.isRunningFlag = false;
    this.pendingRun = false;
    if (this.workerSim) {
      this.workerSim.stop();
      this.workerSim.terminate();
      this.workerSim = null;
      this.workerActive = false;
    }
  }

  /**
   * Get current lattice state
   */
  getState(): LatticeState {
    // For large lattices the object form is only rebuilt on demand (e.g. for
    // save/export), not on every step. Rebuild it here if it has gone stale.
    if (this.stateDirty && this.optimizedSim) {
      this.state = this.optimizedSim.getState();
      this.stateDirty = false;
    }
    // Worker mode keeps no object state on the main thread; rebuild it lazily
    // from the cached raw snapshot when something actually needs it (e.g. save).
    if (!this.state && this.workerActive && this.latestRawState) {
      return this.buildStateFromRaw(this.latestRawState);
    }
    if (!this.state) {
      throw new Error('Simulation not initialized');
    }
    return this.state;
  }

  /**
   * Build the object-graph LatticeState from a compact raw snapshot. Expensive
   * for large N, so only used on demand (save/export in worker mode).
   */
  private buildStateFromRaw(raw: RawLatticeState): LatticeState {
    const numToType = [
      VertexType.a1,
      VertexType.a2,
      VertexType.b1,
      VertexType.b2,
      VertexType.c1,
      VertexType.c2,
    ];
    const vertices: Vertex[][] = [];
    for (let row = 0; row < raw.height; row++) {
      const rowVertices: Vertex[] = [];
      for (let col = 0; col < raw.width; col++) {
        const type = numToType[raw.vertices[row * raw.width + col]];
        // Use the canonical mapping (single source of truth) so arrow/edge
        // rendering of a worker-rebuilt state matches every other code path.
        rowVertices.push({
          position: { row, col },
          type,
          configuration: getVertexConfiguration(type),
        });
      }
      vertices.push(rowVertices);
    }
    return {
      width: raw.width,
      height: raw.height,
      vertices,
      horizontalEdges: [],
      verticalEdges: [],
    };
  }

  /**
   * Whether this controller is running a large lattice on the optimized engine,
   * in which case callers should render from getRawState() rather than getState().
   */
  private isLargeLattice(): boolean {
    return !!this.optimizedSim && this.optimizedSim.getSize() > LARGE_LATTICE_THRESHOLD;
  }

  getRawState(): RawLatticeState | null {
    // Worker mode: serve the latest snapshot pushed by the worker. May be null
    // briefly until the first snapshot arrives after init.
    if (this.workerActive) {
      return this.latestRawState;
    }
    if (!this.optimizedSim) {
      return null;
    }
    const size = this.optimizedSim.getSize();
    return { width: size, height: size, vertices: this.optimizedSim.getRawState() };
  }

  /**
   * After (re)initializing the optimized engine, adopt its state. Large lattices
   * defer the ~N*N object build (rendered from getRawState() instead); smaller
   * ones build the object form eagerly as before.
   */
  private adoptOptimizedState(): void {
    if (!this.optimizedSim) return;
    if (this.optimizedSim.getSize() > LARGE_LATTICE_THRESHOLD) {
      this.state = null;
      this.stateDirty = true;
    } else {
      this.state = this.optimizedSim.getState();
      this.stateDirty = false;
    }
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
    // Worker mode: fire-and-forget; stats + raw state arrive via callbacks which
    // update the cache and emit onStep/onStateChange.
    if (this.workerActive && this.workerSim) {
      this.workerSim.step();
      return;
    }

    // Large lattices keep this.state null (object form is built lazily), so guard
    // on the optimized engine too — otherwise stepping silently no-ops for big N.
    if (!this.state && !this.optimizedSim) {
      console.error('Simulation not initialized - cannot step');
      return; // Don't throw, just return silently
    }

    try {
      // Use optimized implementation if available
      if (this.optimizedSim) {
        this.optimizedSim.run(1);
        this.stats = this.optimizedSim.getStats();
        if (this.isLargeLattice()) {
          // Skip the ~N*N object rebuild and heavy onStateChange payload; callers
          // render from getRawState(). The object form is rebuilt lazily if needed.
          this.stateDirty = true;
        } else {
          this.state = this.optimizedSim.getState();
          if (this.state) {
            this.emit('onStateChange', this.state);
          }
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

    // Original (non-optimized) implementation. Only reached when no optimized
    // engine/worker is present, in which case this.state is always populated.
    if (!this.state) return;
    const state = this.state;

    // Choose a random position
    const row = this.rng.randomInt(0, state.height);
    const col = this.rng.randomInt(0, state.width);
    const position: Position = { row, col };

    // Find valid flips at this position
    const flips = findValidFlips(state, position);

    if (flips.length === 0) {
      this.stats.flipAttempts++;
      return;
    }

    // Choose a random flip
    const flip = this.rng.choice(flips);

    // Calculate energy change
    const deltaE = calculateFlipEnergyChange(state, flip, this.params.weights);

    // Metropolis acceptance criterion
    const acceptProbability = Math.min(1, Math.exp(-this.params.beta * deltaE));

    this.stats.flipAttempts++;

    if (this.rng.random() < acceptProbability) {
      // Accept the flip
      this.state = executeFlip(state, flip);
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
    // Worker mode: hand off to the worker's continuous loop. The worker pushes
    // stats + raw snapshots via callbacks; stop()/pause() halts it. The promise
    // resolves immediately because the loop lives in the worker thread.
    if (this.workerActive && this.workerSim) {
      this.isRunningFlag = true;
      this.isPaused = false;
      this.workerSim.startContinuous(60);
      return;
    }

    // Worker intended but still initializing (async): record the intent so the
    // worker starts as soon as it is ready, rather than throwing below (the
    // optimized engine is intentionally not created in worker mode).
    if (this.useWorker && !this.workerActive) {
      this.isRunningFlag = true;
      this.isPaused = false;
      this.pendingRun = true;
      return;
    }

    if (!this.state && !this.optimizedSim) {
      throw new Error('Simulation not initialized');
    }

    this.isRunningFlag = true;
    this.isPaused = false;

    // Use optimized batch processing if available
    if (this.optimizedSim) {
      const n = this.optimizedSim.getSize();
      const batchSize = n <= 24 ? 1000 : n <= 50 ? 500 : 100;
      let remaining = steps;

      while (remaining > 0 && this.isRunningFlag && !this.isPaused) {
        const batch = Math.min(batchSize, remaining);
        this.optimizedSim.run(batch);
        this.stats = this.optimizedSim.getStats();
        if (this.isLargeLattice()) {
          this.stateDirty = true;
          // Main-thread fallback for a large lattice: emit so the large-aware UI
          // handler pulls the raw snapshot and redraws (worker mode does this via
          // onRawState instead). Without this the canvas would not animate.
          this.emit('onStateChange', this.state as unknown as LatticeState);
        } else {
          this.state = this.optimizedSim.getState();
          if (this.state) {
            this.emit('onStateChange', this.state);
          }
        }
        this.emit('onStep', this.stats);

        remaining -= batch;

        // Allow UI to update
        if (remaining > 0) {
          await new Promise((resolve) => setTimeout(resolve, 0));
        }
      }
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
    // Worker mode: halt the worker's continuous loop. step()/run() can restart it.
    if (this.workerActive && this.workerSim) {
      this.workerSim.stop();
    }
  }

  /**
   * Resume the simulation
   */
  resume(): void {
    this.isPaused = false;
    if (this.workerActive && this.workerSim) {
      this.workerSim.startContinuous(60);
    }
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
      handlers.add(handler as (...args: unknown[]) => unknown);
    }
  }

  off<K extends keyof SimulationEvents>(event: K, handler: SimulationEvents[K]): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.delete(handler as (...args: unknown[]) => unknown);
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
          (handler as (...args: unknown[]) => unknown)(...args);
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
    _temperatures: number[],
    _stepsPerSwap: number,
    _totalSwaps: number,
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
    // getState() handles worker mode (rebuilds the object form from the cached
    // raw snapshot) and the large optimized-engine case (rebuilds if stale).
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
    this.dims = { width: data.state.width, height: data.state.height };
    this.useOptimized = (this.config.useOptimized ?? true) && size > 8;

    // Flatten the imported vertex types into the engine's typed-array state.
    const typeToNum: Record<string, number> = { a1: 0, a2: 1, b1: 2, b2: 3, c1: 4, c2: 5 };
    const flatten = (): Int8Array => {
      const raw = new Int8Array(size * size);
      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          raw[r * size + c] = typeToNum[data.state.vertices[r][c].type] ?? 0;
        }
      }
      return raw;
    };

    // Worker mode: if a worker is already running for this lattice, adopt the
    // imported config in the worker engine (zero-copy transfer of a fresh copy).
    // The buffer is transferred, so send a copy we don't keep.
    if (this.workerActive && this.workerSim && size > LARGE_LATTICE_THRESHOLD) {
      this.workerSim.setState(flatten());
      // Stats + a fresh rawState snapshot arrive via callbacks and refresh the
      // cache; until then the cache may hold the pre-import snapshot.
      return;
    }

    if (this.useOptimized && !this.useWorker) {
      // Recreate the optimized engine, then load the imported configuration into
      // it (previously this was a no-op, so the engine kept a default DWBC state
      // and stepping ignored the import).
      this.optimizedSim = new OptimizedPhysicsSimulation({
        size,
        weights: data.params.weights,
        seed: data.params.seed,
        batchSize: size <= 24 ? 100 : size <= 50 ? 50 : 20,
        initialState: data.params.dwbcConfig?.type === 'low' ? 'dwbc-low' : 'dwbc-high',
      });

      this.optimizedSim.setState(flatten());
      this.stats = this.optimizedSim.getStats();
    }

    // Emit state change event
    if (this.state) {
      this.emit('onStateChange', this.state);
    }
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
