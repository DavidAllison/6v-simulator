/**
 * Common test utilities and assertions for 6-vertex model tests
 */

import {
  LatticeState,
  VertexType,
  EdgeState,
  VertexConfiguration,
} from '../../src/lib/six-vertex/types';
import { validateIceRule } from '../../src/lib/six-vertex/initialStates';
import { calculateHeight } from '../../src/lib/six-vertex/physicsFlips';

/**
 * Assert that a lattice state satisfies the ice rule
 */
export function assertIceRule(state: LatticeState): void {
  const isValid = validateIceRule(state);
  if (!isValid) {
    throw new Error('Lattice state violates ice rule');
  }
}

/**
 * Assert that boundary conditions are correct for DWBC
 */
export function assertDWBCBoundaries(state: LatticeState, type: 'high' | 'low'): void {
  const n = state.width;

  if (type === 'high') {
    // Top boundary: all arrows point down (into lattice)
    for (let col = 0; col < n; col++) {
      expect(state.verticalEdges[0][col]).toBe(EdgeState.In);
    }

    // Bottom boundary: all arrows point down (out of lattice)
    for (let col = 0; col < n; col++) {
      expect(state.verticalEdges[n][col]).toBe(EdgeState.Out);
    }

    // Left boundary: all arrows point right (into lattice)
    for (let row = 0; row < n; row++) {
      expect(state.horizontalEdges[row][0]).toBe(EdgeState.Out);
    }

    // Right boundary: all arrows point right (out of lattice)
    for (let row = 0; row < n; row++) {
      expect(state.horizontalEdges[row][n]).toBe(EdgeState.In);
    }
  } else {
    // Top boundary: all arrows point up (out of lattice)
    for (let col = 0; col < n; col++) {
      expect(state.verticalEdges[0][col]).toBe(EdgeState.Out);
    }

    // Bottom boundary: all arrows point up (into lattice)
    for (let col = 0; col < n; col++) {
      expect(state.verticalEdges[n][col]).toBe(EdgeState.In);
    }

    // Left boundary: all arrows point left (into boundary)
    for (let row = 0; row < n; row++) {
      expect(state.horizontalEdges[row][0]).toBe(EdgeState.In);
    }

    // Right boundary: all arrows point left (out of boundary)
    for (let row = 0; row < n; row++) {
      expect(state.horizontalEdges[row][n]).toBe(EdgeState.Out);
    }
  }
}

/**
 * Count vertex types in a lattice state
 */
export function countVertexTypes(state: LatticeState): Map<VertexType, number> {
  const counts = new Map<VertexType, number>();

  for (let row = 0; row < state.height; row++) {
    for (let col = 0; col < state.width; col++) {
      const type = state.vertices[row][col].type;
      counts.set(type, (counts.get(type) || 0) + 1);
    }
  }

  return counts;
}

/**
 * Create a state signature for comparison
 */
export function getStateSignature(state: LatticeState): string {
  const types: string[] = [];

  for (let row = 0; row < state.height; row++) {
    for (let col = 0; col < state.width; col++) {
      types.push(state.vertices[row][col].type);
    }
  }

  return types.join(',');
}

/**
 * Compare two lattice states for equality
 */
export function statesEqual(state1: LatticeState, state2: LatticeState): boolean {
  if (state1.width !== state2.width || state1.height !== state2.height) {
    return false;
  }

  for (let row = 0; row < state1.height; row++) {
    for (let col = 0; col < state1.width; col++) {
      if (state1.vertices[row][col].type !== state2.vertices[row][col].type) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Get the vertex configuration at a specific position
 */
export function getVertexConfigAt(
  state: LatticeState,
  row: number,
  col: number,
): VertexConfiguration | null {
  if (row < 0 || row >= state.height || col < 0 || col >= state.width) {
    return null;
  }

  return state.vertices[row][col].configuration;
}

/**
 * Count flippable positions in a state
 */
export function countFlippablePositions(state: LatticeState): number {
  let count = 0;

  for (let row = 0; row < state.height; row++) {
    for (let col = 0; col < state.width; col++) {
      const vertex = state.vertices[row][col];

      // Check if this position can flip (simplified check)
      if (
        vertex.type === VertexType.a1 ||
        vertex.type === VertexType.c1 ||
        vertex.type === VertexType.c2
      ) {
        // These types can potentially flip
        count++;
      }
    }
  }

  return count;
}

/**
 * Verify that a 2x2 neighborhood has valid vertex types
 */
export function verify2x2Neighborhood(state: LatticeState, row: number, col: number): boolean {
  if (row < 0 || row >= state.height - 1 || col < 0 || col >= state.width - 1) {
    return false;
  }

  const vertices = [
    state.vertices[row][col],
    state.vertices[row][col + 1],
    state.vertices[row + 1][col],
    state.vertices[row + 1][col + 1],
  ];

  // All vertices should have valid types
  for (const vertex of vertices) {
    if (!Object.values(VertexType).includes(vertex.type)) {
      return false;
    }
  }

  return true;
}

/**
 * Calculate statistics for a lattice state
 */
export interface LatticeStatistics {
  vertexCounts: Map<VertexType, number>;
  height: number;
  totalVertices: number;
  iceRuleValid: boolean;
}

export function calculateStatistics(state: LatticeState): LatticeStatistics {
  return {
    vertexCounts: countVertexTypes(state),
    height: calculateHeight(state),
    totalVertices: state.width * state.height,
    iceRuleValid: validateIceRule(state),
  };
}

/**
 * Generate a human-readable description of vertex distribution
 */
export function describeVertexDistribution(counts: Map<VertexType, number>): string {
  const total = Array.from(counts.values()).reduce((a, b) => a + b, 0);
  const lines: string[] = [];

  for (const [type, count] of counts) {
    const percentage = ((count / total) * 100).toFixed(1);
    lines.push(`${type}: ${count} (${percentage}%)`);
  }

  return lines.join(', ');
}

/**
 * Assert that vertex counts match expected values
 */
export function assertVertexCounts(
  state: LatticeState,
  expected: Partial<Record<VertexType, number>>,
): void {
  const actual = countVertexTypes(state);

  for (const [type, expectedCount] of Object.entries(expected)) {
    const actualCount = actual.get(type as VertexType) || 0;
    expect(actualCount).toBe(expectedCount);
  }
}

/**
 * Create a mock lattice state for testing
 */
export function createMockState(
  width: number,
  height: number,
  defaultType: VertexType = VertexType.a1,
): LatticeState {
  const vertices = [];
  const horizontalEdges = [];
  const verticalEdges = [];

  // Initialize vertices
  for (let row = 0; row < height; row++) {
    vertices[row] = [];
    for (let col = 0; col < width; col++) {
      vertices[row][col] = {
        type: defaultType,
        configuration: {
          left: EdgeState.In,
          right: EdgeState.Out,
          top: EdgeState.In,
          bottom: EdgeState.Out,
        },
      };
    }
  }

  // Initialize edges
  for (let row = 0; row <= height; row++) {
    verticalEdges[row] = [];
    for (let col = 0; col < width; col++) {
      verticalEdges[row][col] = EdgeState.In;
    }
  }

  for (let row = 0; row < height; row++) {
    horizontalEdges[row] = [];
    for (let col = 0; col <= width; col++) {
      horizontalEdges[row][col] = EdgeState.Out;
    }
  }

  return {
    width,
    height,
    vertices,
    horizontalEdges,
    verticalEdges,
  };
}

/**
 * Measure performance of a function
 */
export async function measurePerformance<T>(
  fn: () => T,
  iterations: number = 100,
): Promise<{ averageTime: number; minTime: number; maxTime: number; result: T }> {
  const times: number[] = [];
  let result: T;

  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    result = fn();
    const end = performance.now();
    times.push(end - start);
  }

  const averageTime = times.reduce((a, b) => a + b, 0) / times.length;
  const minTime = Math.min(...times);
  const maxTime = Math.max(...times);

  return { averageTime, minTime, maxTime, result: result! };
}

/**
 * Wait for a condition to be true
 */
export async function waitFor(
  condition: () => boolean,
  timeout: number = 5000,
  interval: number = 100,
): Promise<void> {
  const startTime = Date.now();

  while (!condition()) {
    if (Date.now() - startTime > timeout) {
      throw new Error('Timeout waiting for condition');
    }

    await new Promise((resolve) => setTimeout(resolve, interval));
  }
}

/**
 * Create a deterministic sequence of vertex types
 */
export function createDeterministicPattern(
  width: number,
  height: number,
  pattern: (row: number, col: number) => VertexType,
): LatticeState {
  const state = createMockState(width, height);

  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      state.vertices[row][col].type = pattern(row, col);

      // Update configuration based on type
      // This is simplified - real configurations depend on neighbors
      switch (state.vertices[row][col].type) {
        case VertexType.a1:
          state.vertices[row][col].configuration = {
            left: EdgeState.In,
            top: EdgeState.In,
            right: EdgeState.Out,
            bottom: EdgeState.Out,
          };
          break;
        case VertexType.a2:
          state.vertices[row][col].configuration = {
            right: EdgeState.In,
            bottom: EdgeState.In,
            left: EdgeState.Out,
            top: EdgeState.Out,
          };
          break;
        case VertexType.b1:
          state.vertices[row][col].configuration = {
            left: EdgeState.In,
            right: EdgeState.In,
            top: EdgeState.Out,
            bottom: EdgeState.Out,
          };
          break;
        case VertexType.b2:
          state.vertices[row][col].configuration = {
            top: EdgeState.In,
            bottom: EdgeState.In,
            left: EdgeState.Out,
            right: EdgeState.Out,
          };
          break;
        case VertexType.c1:
          state.vertices[row][col].configuration = {
            left: EdgeState.In,
            bottom: EdgeState.In,
            right: EdgeState.Out,
            top: EdgeState.Out,
          };
          break;
        case VertexType.c2:
          state.vertices[row][col].configuration = {
            right: EdgeState.In,
            top: EdgeState.In,
            left: EdgeState.Out,
            bottom: EdgeState.Out,
          };
          break;
      }
    }
  }

  return state;
}
