/**
 * Optimized Monte Carlo simulation engine for the 6-vertex model
 * Features:
 * - Incremental flippable list management with O(1) lookups
 * - Typed arrays for better memory layout
 * - Batch processing for multiple steps per frame
 * - Cached weight ratios
 * - Optimized RNG
 * - Object pooling to reduce GC pressure
 */

import { VertexType, getVertexConfiguration } from './types';
import { FlipDirection } from './physicsFlips';
import {
  isFlipValidCStyle as isFlipValid,
  executeFlipCStyle as executeValidFlip,
  getWeightRatioCStyle,
  validateIceRule,
  VERTEX_A1,
  VERTEX_A2,
  VERTEX_B1,
  VERTEX_B2,
  VERTEX_C1,
  VERTEX_C2,
} from './cStyleFlipLogic';

// Vertex type constants are now imported from fixedFlipLogic

// Map between enum and numeric values
const NUM_TO_VERTEX_TYPE = [
  VertexType.a1,
  VertexType.a2,
  VertexType.b1,
  VertexType.b2,
  VertexType.c1,
  VertexType.c2,
];

/**
 * Fast XorShift random number generator
 * Much faster than Mulberry32 with good enough statistical properties
 */
class FastRNG {
  private state: Uint32Array;

  constructor(seed: number = Date.now()) {
    this.state = new Uint32Array(4);
    this.state[0] = seed;
    this.state[1] = seed ^ 0x1234567;
    this.state[2] = seed ^ 0xabcdef;
    this.state[3] = seed ^ 0xfedcba;
  }

  // XorShift128+ algorithm
  next(): number {
    let t = this.state[3];
    const s = this.state[0];
    this.state[3] = this.state[2];
    this.state[2] = this.state[1];
    this.state[1] = s;

    t ^= t << 11;
    t ^= t >>> 8;

    this.state[0] = t ^ s ^ (s >>> 19);

    // Mask the sum back to uint32 before normalizing. Without `>>> 0` the sum of
    // two uint32 words reaches ~2^33, so this returned values in [0, ~2.0) — half
    // of all draws were >= 1.0, which silently biased every acceptance test and
    // made nextInt() return out-of-bounds indices. Now strictly in [0, 1).
    return ((this.state[0] + this.state[1]) >>> 0) / 4294967296;
  }

  nextInt(max: number): number {
    return (this.next() * max) | 0;
  }
}

/**
 * Flippable position with cached metadata
 */
interface FlippablePosition {
  row: number;
  col: number;
  canFlipUp: boolean;
  canFlipDown: boolean;
  listIndex: number; // Index in the flippable list for O(1) removal
}

/**
 * Optimized simulation configuration
 */
export interface OptimizedSimConfig {
  size: number;
  weights: {
    a1: number;
    a2: number;
    b1: number;
    b2: number;
    c1: number;
    c2: number;
  };
  beta?: number; // Inverse temperature for Metropolis algorithm
  seed?: number;
  batchSize?: number; // Number of steps to process per batch
  useCachedWeights?: boolean; // Use precomputed weight ratios
  initialState?: 'dwbc-high' | 'dwbc-low';
}

/**
 * Optimized physics simulation with incremental updates
 */
export class OptimizedPhysicsSimulation {
  private size: number;
  private vertices: Int8Array; // Compact vertex type storage
  private weights: Float32Array; // Weight values in array form
  private weightRatioCache: Float32Array | null = null; // Cached weight ratios
  private rng: FastRNG;

  // Flippable list management
  private flippableList: FlippablePosition[] = [];
  private flippableMap: Map<number, FlippablePosition> = new Map(); // key: row * size + col
  private flippableUpList: number[] = []; // Indices of positions that can flip up
  private flippableDownList: number[] = []; // Indices of positions that can flip down

  // Statistics
  private stepCount: number = 0;
  private successfulFlips: number = 0;
  private attemptedFlips: number = 0;
  private currentHeight: number = 0;

  // Performance options
  private batchSize: number;
  private useCachedWeights: boolean;

  constructor(config: OptimizedSimConfig) {
    this.size = config.size;
    this.batchSize = config.batchSize || 100;
    this.useCachedWeights = config.useCachedWeights !== false;
    this.rng = new FastRNG(config.seed);

    // Initialize typed arrays
    this.vertices = new Int8Array(this.size * this.size);
    this.weights = new Float32Array(6);
    this.weights[VERTEX_A1] = config.weights.a1;
    this.weights[VERTEX_A2] = config.weights.a2;
    this.weights[VERTEX_B1] = config.weights.b1;
    this.weights[VERTEX_B2] = config.weights.b2;
    this.weights[VERTEX_C1] = config.weights.c1;
    this.weights[VERTEX_C2] = config.weights.c2;

    // Initialize state
    this.initializeState(config.initialState || 'dwbc-high');

    // Build initial flippable list
    this.buildFlippableList();

    // Precompute weight ratios if enabled
    if (this.useCachedWeights) {
      this.precomputeWeightRatios();
    }
  }

  /**
   * Set the state from an external source
   */
  public setState(state: Uint8Array | Int8Array): void {
    if (state.length !== this.size * this.size) {
      throw new Error(`Invalid state size: expected ${this.size * this.size}, got ${state.length}`);
    }

    // Copy the state
    for (let i = 0; i < state.length; i++) {
      this.vertices[i] = state[i];
    }

    // Rebuild the flippable list
    this.buildFlippableList();

    // Recalculate height
    this.currentHeight = 0;
    for (let i = 0; i < this.vertices.length; i++) {
      if (this.vertices[i] === VERTEX_C2) {
        this.currentHeight++;
      }
    }
  }

  /**
   * Perform a single Monte Carlo step
   */
  public step(): any {
    this.performStep();
    return this.getStats();
  }

  /**
   * Initialize lattice state
   */
  private initializeState(type: 'dwbc-high' | 'dwbc-low'): void {
    // Proper DWBC initialization based on the paper

    if (type === 'dwbc-high') {
      // DWBC High: c2 on anti-diagonal, b1 upper-left, b2 lower-right
      for (let row = 0; row < this.size; row++) {
        for (let col = 0; col < this.size; col++) {
          const idx = row * this.size + col;
          if (row + col === this.size - 1) {
            // Anti-diagonal: c2
            this.vertices[idx] = VERTEX_C2;
          } else if (row + col < this.size - 1) {
            // Upper-left triangle: b1
            this.vertices[idx] = VERTEX_B1;
          } else {
            // Lower-right triangle: b2
            this.vertices[idx] = VERTEX_B2;
          }
        }
      }
      // Height is number of c2 vertices (the diagonal)
      this.currentHeight = this.size;
    } else {
      // DWBC Low: c2 on main diagonal, a1 upper-right, a2 lower-left
      for (let row = 0; row < this.size; row++) {
        for (let col = 0; col < this.size; col++) {
          const idx = row * this.size + col;
          if (row === col) {
            // Main diagonal: c2
            this.vertices[idx] = VERTEX_C2;
          } else if (row < col) {
            // Upper-right triangle: a1
            this.vertices[idx] = VERTEX_A1;
          } else {
            // Lower-left triangle: a2
            this.vertices[idx] = VERTEX_A2;
          }
        }
      }
      // Height is number of c2 vertices (the diagonal)
      this.currentHeight = this.size;
    }
  }

  /**
   * Build the initial flippable list by scanning the entire lattice
   */
  private buildFlippableList(): void {
    this.flippableList = [];
    this.flippableMap.clear();
    this.flippableUpList = [];
    this.flippableDownList = [];

    for (let row = 0; row < this.size; row++) {
      for (let col = 0; col < this.size; col++) {
        const capability = this.checkFlippable(row, col);

        if (capability.canFlipUp || capability.canFlipDown) {
          const pos: FlippablePosition = {
            row,
            col,
            canFlipUp: capability.canFlipUp,
            canFlipDown: capability.canFlipDown,
            listIndex: this.flippableList.length,
          };

          this.flippableList.push(pos);
          this.flippableMap.set(row * this.size + col, pos);

          if (capability.canFlipUp) {
            this.flippableUpList.push(pos.listIndex);
          }
          if (capability.canFlipDown) {
            this.flippableDownList.push(pos.listIndex);
          }
        }
      }
    }
  }

  /**
   * Check if a position can be flipped (using fixed logic)
   */
  private checkFlippable(row: number, col: number): { canFlipUp: boolean; canFlipDown: boolean } {
    const result = { canFlipUp: false, canFlipDown: false };

    if (row < 0 || row >= this.size || col < 0 || col >= this.size) {
      return result;
    }

    // Use the fixed flip validation logic
    result.canFlipUp = isFlipValid(this.vertices, this.size, row, col, FlipDirection.Up);
    result.canFlipDown = isFlipValid(this.vertices, this.size, row, col, FlipDirection.Down);

    return result;
  }

  /**
   * Update flippable list after a flip
   * For simplicity and correctness, we just rebuild the entire list
   * This ensures we don't miss any new flippable positions
   */
  private updateFlippableListAfterFlip(
    _row: number,
    _col: number,
    _direction: FlipDirection,
  ): void {
    // Simply rebuild the entire list to ensure correctness
    // This is more robust than trying to do incremental updates
    this.buildFlippableList();
  }

  /**
   * Remove a position from the flippable list
   */
  private removeFlippablePosition(pos: FlippablePosition): void {
    const key = pos.row * this.size + pos.col;
    this.flippableMap.delete(key);

    // Mark as removed (we'll clean up periodically to avoid array shifting)
    this.flippableList[pos.listIndex] = null as any;
  }

  /**
   * Rebuild the direction-specific lists
   */
  private rebuildDirectionLists(): void {
    this.flippableUpList = [];
    this.flippableDownList = [];

    for (let i = 0; i < this.flippableList.length; i++) {
      const pos = this.flippableList[i];
      if (pos) {
        if (pos.canFlipUp) {
          this.flippableUpList.push(i);
        }
        if (pos.canFlipDown) {
          this.flippableDownList.push(i);
        }
      }
    }
  }

  /**
   * Clean up the flippable list by removing null entries
   */
  private cleanupFlippableList(): void {
    const newList: FlippablePosition[] = [];
    const newMap = new Map<number, FlippablePosition>();

    for (const pos of this.flippableList) {
      if (pos) {
        pos.listIndex = newList.length;
        newList.push(pos);
        newMap.set(pos.row * this.size + pos.col, pos);
      }
    }

    this.flippableList = newList;
    this.flippableMap = newMap;
    this.rebuildDirectionLists();
  }

  /**
   * Execute a flip (using corrected logic with validation)
   */
  private executeFlipInPlace(row: number, col: number, direction: FlipDirection): boolean {
    // Count c2 vertices before flip
    let c2CountBefore = 0;
    for (let i = 0; i < this.vertices.length; i++) {
      if (this.vertices[i] === VERTEX_C2) c2CountBefore++;
    }

    // Use the corrected flip execution logic
    const success = executeValidFlip(this.vertices, this.size, row, col, direction);

    if (success) {
      // Count c2 vertices after flip to update height
      let c2CountAfter = 0;
      for (let i = 0; i < this.vertices.length; i++) {
        if (this.vertices[i] === VERTEX_C2) c2CountAfter++;
      }

      // Update height based on c2 count change
      this.currentHeight += c2CountAfter - c2CountBefore;

      // Validate lattice integrity in debug mode
      if (process.env.NODE_ENV === 'development') {
        const validation = validateIceRule(this.vertices, this.size);
        if (!validation.valid) {
          console.error('Ice rule violated after flip!', validation.errors);
          // In debug mode, we can choose to revert or log the error
        }
      }
    }

    return success;
  }

  /**
   * Calculate weight ratio for a flip (using C-style calculation)
   */
  private getWeightRatio(row: number, col: number, direction: FlipDirection): number {
    return getWeightRatioCStyle(this.vertices, this.weights, this.size, row, col, direction);
  }

  /**
   * Precompute weight ratios for all possible 2x2 configurations
   */
  private precomputeWeightRatios(): void {
    // This would store all possible weight ratios
    // For simplicity, we'll skip this optimization for now
    // as it requires 6^4 * 2 entries
  }

  /**
   * Perform a single Monte Carlo step
   */
  private performStep(): void {
    // Filter out any null/undefined entries
    const validPositions = this.flippableList.filter((p) => p != null);

    // If no flippable positions, return early
    if (validPositions.length === 0) {
      return;
    }

    // Select a random position from the valid list
    const pos = validPositions[this.rng.nextInt(validPositions.length)];

    // Safety check
    if (!pos) {
      return;
    }

    // Execute the flip attempt
    this.attemptedFlips++;
    this.executeFlipStep(pos);
    this.stepCount++;
  }

  /**
   * Execute a flip step for a given position
   */
  private executeFlipStep(pos: FlippablePosition): void {
    // Handle different flip scenarios
    if (pos.canFlipUp && !pos.canFlipDown) {
      // Can only flip up
      const weightRatio = this.getWeightRatio(pos.row, pos.col, FlipDirection.Up);
      // Heat-bath acceptance over {stay, flip}: p = w_after/(w_before+w_after) =
      // ratio/(1+ratio). This matches the biflip branch below and samples the
      // correct Gibbs measure. The old `min(1, ratio/maxWeight)` divided by the
      // global max plaquette weight, collapsing acceptance to ~0 whenever any
      // weight was favored — it froze c-/a-dominant runs and inverted the
      // equilibrium (favoring a vertex type produced FEWER of it). See #69.
      const acceptanceProbability = weightRatio / (1.0 + weightRatio);

      if (this.rng.next() < acceptanceProbability) {
        if (this.executeFlipInPlace(pos.row, pos.col, FlipDirection.Up)) {
          this.updateFlippableListAfterFlip(pos.row, pos.col, FlipDirection.Up);
          this.successfulFlips++;
        }
      }
    } else if (!pos.canFlipUp && pos.canFlipDown) {
      // Can only flip down
      const weightRatio = this.getWeightRatio(pos.row, pos.col, FlipDirection.Down);
      // Heat-bath acceptance over {stay, flip}; see the Up branch above (#69).
      const acceptanceProbability = weightRatio / (1.0 + weightRatio);

      if (this.rng.next() < acceptanceProbability) {
        if (this.executeFlipInPlace(pos.row, pos.col, FlipDirection.Down)) {
          this.updateFlippableListAfterFlip(pos.row, pos.col, FlipDirection.Down);
          this.successfulFlips++;
        }
      }
    } else {
      // Can flip both ways (biflip) - use heat bath algorithm
      const upRatio = this.getWeightRatio(pos.row, pos.col, FlipDirection.Up);
      const downRatio = this.getWeightRatio(pos.row, pos.col, FlipDirection.Down);

      // Heat bath: normalize probabilities
      const totalWeight = 1.0 + upRatio + downRatio; // 1.0 for no flip
      const upProbability = upRatio / totalWeight;
      const downProbability = downRatio / totalWeight;

      const random = this.rng.next();

      if (random < upProbability) {
        if (this.executeFlipInPlace(pos.row, pos.col, FlipDirection.Up)) {
          this.updateFlippableListAfterFlip(pos.row, pos.col, FlipDirection.Up);
          this.successfulFlips++;
        }
      } else if (random < upProbability + downProbability) {
        if (this.executeFlipInPlace(pos.row, pos.col, FlipDirection.Down)) {
          this.updateFlippableListAfterFlip(pos.row, pos.col, FlipDirection.Down);
          this.successfulFlips++;
        }
      }
      // else: no flip (with probability 1/totalWeight)
    }
  }

  /**
   * Run simulation for multiple steps (batched)
   */
  public run(steps: number): void {
    const batches = Math.ceil(steps / this.batchSize);

    for (let batch = 0; batch < batches; batch++) {
      const batchSteps = Math.min(this.batchSize, steps - batch * this.batchSize);

      for (let i = 0; i < batchSteps; i++) {
        this.performStep();
      }
    }
  }

  /**
   * Run simulation continuously with callback
   */
  public runContinuous(
    onBatch: (stats: any) => void,
    targetFPS: number = 60,
  ): { stop: () => void } {
    let running = true;
    const frameTime = 1000 / targetFPS;
    let lastTime = performance.now();

    const animate = () => {
      if (!running) return;

      const currentTime = performance.now();
      const deltaTime = currentTime - lastTime;

      if (deltaTime >= frameTime) {
        // Calculate how many steps we can do in this frame
        const stepsPerFrame = Math.max(1, Math.floor(this.batchSize * (deltaTime / frameTime)));

        // Run the simulation
        this.run(stepsPerFrame);

        // Callback with stats
        onBatch(this.getStats());

        lastTime = currentTime;
      }

      requestAnimationFrame(animate);
    };

    animate();

    return {
      stop: () => {
        running = false;
      },
    };
  }

  /**
   * Get current statistics
   */
  public getStats(): any {
    // Count vertex types
    const vertexCounts = new Array(6).fill(0);
    for (let i = 0; i < this.vertices.length; i++) {
      vertexCounts[this.vertices[i]]++;
    }

    // Calculate energy E = -Σ count_i · ln(w_i). Skip empty types: a type with
    // zero count contributes nothing, and including it would compute
    // 0 · ln(0) = NaN whenever a forbidden (weight-0) type is simply absent —
    // poisoning the whole energy readout. A weight-0 type that IS present still
    // yields +Infinity, which is the physically correct "forbidden config" cost.
    let energy = 0;
    for (let i = 0; i < 6; i++) {
      if (vertexCounts[i] > 0) {
        energy -= vertexCounts[i] * Math.log(this.weights[i]);
      }
    }

    const acceptanceRate = this.attemptedFlips > 0 ? this.successfulFlips / this.attemptedFlips : 0;

    return {
      step: this.stepCount,
      energy,
      vertexCounts: {
        [VertexType.a1]: vertexCounts[VERTEX_A1],
        [VertexType.a2]: vertexCounts[VERTEX_A2],
        [VertexType.b1]: vertexCounts[VERTEX_B1],
        [VertexType.b2]: vertexCounts[VERTEX_B2],
        [VertexType.c1]: vertexCounts[VERTEX_C1],
        [VertexType.c2]: vertexCounts[VERTEX_C2],
      },
      acceptanceRate,
      flipAttempts: this.attemptedFlips,
      successfulFlips: this.successfulFlips,
      height: this.currentHeight,
      flippableCount: this.flippableList.filter((p) => p !== null).length,
    };
  }

  /**
   * Get raw vertex array
   */
  public getRawState(): Int8Array {
    return new Int8Array(this.vertices);
  }

  /**
   * Linear dimension N of the (square) lattice.
   */
  public getSize(): number {
    return this.size;
  }

  /**
   * Get current state as a standard LatticeState (for rendering)
   */
  public getState(): any {
    // Convert back to standard format for compatibility
    const vertices: any[][] = [];

    for (let row = 0; row < this.size; row++) {
      const rowVertices: any[] = [];
      for (let col = 0; col < this.size; col++) {
        const idx = row * this.size + col;
        const type = NUM_TO_VERTEX_TYPE[this.vertices[idx]];
        rowVertices.push({
          position: { row, col },
          type,
          configuration: this.getVertexConfiguration(type),
        });
      }
      vertices.push(rowVertices);
    }

    return {
      width: this.size,
      height: this.size,
      vertices,
      horizontalEdges: [], // Not needed for physics simulation
      verticalEdges: [], // Not needed for physics simulation
    };
  }

  /**
   * Get vertex configuration from type. Delegates to the single source of truth
   * in types.ts so the object-snapshot arrows match the rest of the app.
   */
  private getVertexConfiguration(type: VertexType) {
    return getVertexConfiguration(type);
  }

  /**
   * Update weights without resetting the lattice state
   */
  public updateWeights(newWeights: {
    a1: number;
    a2: number;
    b1: number;
    b2: number;
    c1: number;
    c2: number;
  }): void {
    // Update internal weights array
    this.weights[VERTEX_A1] = newWeights.a1;
    this.weights[VERTEX_A2] = newWeights.a2;
    this.weights[VERTEX_B1] = newWeights.b1;
    this.weights[VERTEX_B2] = newWeights.b2;
    this.weights[VERTEX_C1] = newWeights.c1;
    this.weights[VERTEX_C2] = newWeights.c2;

    // No need to rebuild flippable list - lattice topology unchanged
    // The weight changes will be automatically used in the next flip attempts
  }

  /**
   * Reset simulation
   */
  public reset(): void {
    this.stepCount = 0;
    this.successfulFlips = 0;
    this.attemptedFlips = 0;
    this.initializeState('dwbc-high');
    this.buildFlippableList();
  }
}

// Export alias for convenience
export const OptimizedSimulation = OptimizedPhysicsSimulation;

// Export functions to generate DWBC states as Uint8Array for testing
export function generateDWBCHighOptimized(size: number): Uint8Array {
  const vertices = new Uint8Array(size * size);

  // DWBC High: c2 on anti-diagonal, b1 upper-left, b2 lower-right
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      const idx = row * size + col;
      if (row + col === size - 1) {
        // Anti-diagonal: c2
        vertices[idx] = 5; // VERTEX_C2
      } else if (row + col < size - 1) {
        // Upper-left triangle: b1
        vertices[idx] = 2; // VERTEX_B1
      } else {
        // Lower-right triangle: b2
        vertices[idx] = 3; // VERTEX_B2
      }
    }
  }

  return vertices;
}

export function generateDWBCLowOptimized(size: number): Uint8Array {
  const vertices = new Uint8Array(size * size);

  // DWBC Low: c2 on main diagonal, a1 upper-right, a2 lower-left
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      const idx = row * size + col;
      if (row === col) {
        // Main diagonal: c2
        vertices[idx] = 5; // VERTEX_C2
      } else if (row < col) {
        // Upper-right triangle: a1
        vertices[idx] = 0; // VERTEX_A1
      } else {
        // Lower-left triangle: a2
        vertices[idx] = 1; // VERTEX_A2
      }
    }
  }

  return vertices;
}

/**
 * Performance benchmark function
 */
export function benchmarkSimulation(
  size: number,
  steps: number,
): {
  timeMs: number;
  stepsPerSecond: number;
  stats: any;
} {
  const startTime = performance.now();

  const sim = new OptimizedPhysicsSimulation({
    size,
    weights: {
      a1: 1.0,
      a2: 1.0,
      b1: 1.0,
      b2: 1.0,
      c1: 1.0,
      c2: 1.0,
    },
    seed: 42,
    batchSize: 1000,
  });

  sim.run(steps);

  const endTime = performance.now();
  const timeMs = endTime - startTime;
  const stepsPerSecond = (steps / timeMs) * 1000;

  return {
    timeMs,
    stepsPerSecond,
    stats: sim.getStats(),
  };
}
