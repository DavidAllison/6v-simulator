/**
 * Core type definitions for the 6-vertex model simulator
 * Based on the square ice model with vertex configurations
 */

/**
 * Vertex types based on the 6 allowed ice configurations
 * Named according to the paper conventions:
 * - a1, a2: Source/sink configurations (2 in, 2 out or vice versa)
 * - b1, b2: Straight-through configurations (horizontal or vertical flow)
 * - c1, c2: Turn configurations (flow changes direction)
 */
export const VertexType = {
  a1: 'a1', // In: left, top    | Out: right, bottom
  a2: 'a2', // In: right, bottom | Out: left, top
  b1: 'b1', // In: left, right   | Out: top, bottom
  b2: 'b2', // In: top, bottom   | Out: left, right
  c1: 'c1', // In: left, bottom  | Out: right, top
  c2: 'c2', // In: right, top    | Out: left, bottom
} as const;

export type VertexType = (typeof VertexType)[keyof typeof VertexType];

/**
 * Edge direction relative to a vertex
 */
export const EdgeDirection = {
  Left: 'left',
  Right: 'right',
  Top: 'top',
  Bottom: 'bottom',
} as const;

export type EdgeDirection = (typeof EdgeDirection)[keyof typeof EdgeDirection];

/**
 * Edge state (arrow direction on the edge)
 * For horizontal edges: In = left-to-right, Out = right-to-left
 * For vertical edges: In = top-to-bottom, Out = bottom-to-top
 */
export const EdgeState = {
  In: 'in',
  Out: 'out',
} as const;

export type EdgeState = (typeof EdgeState)[keyof typeof EdgeState];

/**
 * Represents a position in the lattice
 */
export interface Position {
  row: number;
  col: number;
}

/**
 * Represents an edge in the lattice
 */
export interface Edge {
  from: Position;
  to: Position;
  state: EdgeState;
}

/**
 * Configuration of edges around a single vertex
 */
export interface VertexConfiguration {
  left: EdgeState;
  right: EdgeState;
  top: EdgeState;
  bottom: EdgeState;
}

/**
 * A vertex in the lattice with its type and position
 */
export interface Vertex {
  position: Position;
  type: VertexType;
  configuration: VertexConfiguration;
}

/**
 * The complete lattice state
 */
export interface LatticeState {
  width: number;
  height: number;
  vertices: Vertex[][];
  // Store edge states for efficient access
  horizontalEdges: EdgeState[][]; // [row][col] represents edge to the right of vertex
  verticalEdges: EdgeState[][]; // [row][col] represents edge below vertex
}

/**
 * Boundary conditions for the lattice
 */
export const BoundaryCondition = {
  Periodic: 'periodic', // Toroidal topology
  Fixed: 'fixed', // Fixed boundary arrows
  Open: 'open', // Open boundaries
  DWBC: 'dwbc', // Domain Wall Boundary Conditions
} as const;

export type BoundaryCondition = (typeof BoundaryCondition)[keyof typeof BoundaryCondition];

/**
 * Configuration for DWBC (Domain Wall Boundary Conditions)
 */
export interface DWBCConfig {
  type: 'high' | 'low';
  // High: all top/right edges point in, all bottom/left edges point out
  // Low: opposite of high
}

/**
 * A flip operation that can be performed on the lattice
 */
export interface FlipOperation {
  vertices: Position[]; // Vertices involved in the flip (usually 2)
  edgesToFlip: Edge[]; // Edges that will change state
  isValid: boolean; // Whether this flip maintains ice rule
}

/**
 * Parameters for the Monte Carlo simulation
 */
export interface SimulationParams {
  temperature: number; // Temperature parameter for Metropolis algorithm
  beta: number; // Inverse temperature (1/kT)
  weights: {
    // Boltzmann weights for each vertex type
    a1: number;
    a2: number;
    b1: number;
    b2: number;
    c1: number;
    c2: number;
  };
  boundaryCondition: BoundaryCondition;
  dwbcConfig?: DWBCConfig;
  seed?: number; // Random seed for reproducibility
}

/**
 * Statistics collected during simulation
 */
export interface SimulationStats {
  step: number;
  energy: number;
  vertexCounts: Record<VertexType, number>;
  acceptanceRate: number;
  flipAttempts: number;
  successfulFlips: number;
  beta: number;
  height?: number;
  volume?: number;
  delta?: number;
  entropy?: number;
}

/**
 * Rendering modes for visualization
 */
export const RenderMode = {
  Paths: 'paths', // Show bold edges forming paths
  Arrows: 'arrows', // Show arrow directions on edges
  Both: 'both', // Show both paths and arrows
  Vertices: 'vertices', // Color-code vertex types
} as const;

export type RenderMode = (typeof RenderMode)[keyof typeof RenderMode];

/**
 * Rendering configuration
 */
export interface RenderConfig {
  mode: RenderMode;
  cellSize: number; // Size of each lattice cell in pixels
  lineWidth: number; // Width of edges
  colors: {
    background: string;
    grid: string;
    pathSegment: string; // Bold edges in path mode
    arrow: string;
    vertexTypes: Record<VertexType, string>;
  };
  showGrid: boolean;
  animateFlips: boolean;
  animationDuration: number; // ms
}

/**
 * Observable events emitted during simulation
 */
export interface SimulationEvents {
  onStep: (stats: SimulationStats) => void;
  onFlip: (flip: FlipOperation) => void;
  onStateChange: (state: LatticeState) => void;
  onError: (error: Error) => void;
}

/**
 * Main simulation controller interface
 */
export interface SimulationController {
  // State management
  initialize(width: number, height: number, params: SimulationParams): void;
  reset(): void;
  getState(): LatticeState;
  setState(state: LatticeState): void;

  // Simulation control
  step(): void;
  run(steps: number): void;
  pause(): void;
  resume(): void;
  isRunning(): boolean;

  // Configuration
  updateParams(params: Partial<SimulationParams>): void;
  getParams(): SimulationParams;
  getStats(): SimulationStats;

  // Event handling
  on<K extends keyof SimulationEvents>(event: K, handler: SimulationEvents[K]): void;
  off<K extends keyof SimulationEvents>(event: K, handler: SimulationEvents[K]): void;

  // Data export/import
  exportData(): {
    params: SimulationParams;
    stats: SimulationStats;
    state: LatticeState;
  };
  importData(data: { params: SimulationParams; stats: SimulationStats; state: LatticeState }): void;
}

/**
 * Type guard to check if a configuration represents a valid vertex type
 */
export function getVertexType(config: VertexConfiguration): VertexType | null {
  const { left, right, top, bottom } = config;

  // Count ins and outs
  const ins = [left, right, top, bottom].filter((e) => e === EdgeState.In).length;
  const outs = [left, right, top, bottom].filter((e) => e === EdgeState.Out).length;

  // Ice rule: must have 2 ins and 2 outs
  if (ins !== 2 || outs !== 2) {
    return null;
  }

  // Determine vertex type based on configuration
  if (left === EdgeState.In && top === EdgeState.In) return VertexType.a1;
  if (right === EdgeState.In && bottom === EdgeState.In) return VertexType.a2;
  if (left === EdgeState.In && right === EdgeState.In) return VertexType.b1;
  if (top === EdgeState.In && bottom === EdgeState.In) return VertexType.b2;
  if (left === EdgeState.In && bottom === EdgeState.In) return VertexType.c1;
  if (right === EdgeState.In && top === EdgeState.In) return VertexType.c2;

  return null;
}

/**
 * Get vertex configuration from vertex type
 */
export function getVertexConfiguration(type: VertexType): VertexConfiguration {
  switch (type) {
    case VertexType.a1:
      return {
        left: EdgeState.In,
        top: EdgeState.In,
        right: EdgeState.Out,
        bottom: EdgeState.Out,
      };
    case VertexType.a2:
      return {
        right: EdgeState.In,
        bottom: EdgeState.In,
        left: EdgeState.Out,
        top: EdgeState.Out,
      };
    case VertexType.b1:
      return {
        left: EdgeState.In,
        right: EdgeState.In,
        top: EdgeState.Out,
        bottom: EdgeState.Out,
      };
    case VertexType.b2:
      return {
        top: EdgeState.In,
        bottom: EdgeState.In,
        left: EdgeState.Out,
        right: EdgeState.Out,
      };
    case VertexType.c1:
      return {
        left: EdgeState.In,
        bottom: EdgeState.In,
        right: EdgeState.Out,
        top: EdgeState.Out,
      };
    case VertexType.c2:
      return {
        right: EdgeState.In,
        top: EdgeState.In,
        left: EdgeState.Out,
        bottom: EdgeState.Out,
      };
  }
}
