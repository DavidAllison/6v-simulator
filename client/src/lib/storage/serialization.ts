/**
 * Serialization utilities for converting simulation state to/from storable format
 */

import type {
  LatticeState,
  SimulationParams,
  SimulationStats,
  Vertex,
  VertexType,
  EdgeState,
} from '../six-vertex/types';
import type { SimulationData } from './types';
import { compress, decompress, shouldCompress } from './compression';

/**
 * Version of the serialization format
 */
export const SERIALIZATION_VERSION = '1.0.0';

/**
 * Compact representation of a vertex for storage
 */
interface CompactVertex {
  t: VertexType; // type
  // Position is implicit from array index
  // Configuration can be reconstructed from edges
}

/**
 * Compact representation of lattice state
 */
interface CompactLatticeState {
  w: number; // width
  h: number; // height
  v: string; // vertices as compact string
  he: string; // horizontal edges as compact string
  ve: string; // vertical edges as compact string
}

/**
 * Serialize a lattice state to a compact format
 */
export function serializeLatticeState(state: LatticeState): CompactLatticeState {
  const { width, height, vertices, horizontalEdges, verticalEdges } = state;

  // Convert vertex types to a compact string (one char per vertex)
  const vertexTypes: string[] = [];
  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      const vertex = vertices[row][col];
      // Map vertex types to single characters
      vertexTypes.push(vertexTypeToChar(vertex.type));
    }
  }

  // Convert edges to compact strings (0 for 'out', 1 for 'in')
  const hEdges: string[] = [];
  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      hEdges.push(horizontalEdges[row][col] === 'in' ? '1' : '0');
    }
  }

  const vEdges: string[] = [];
  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      vEdges.push(verticalEdges[row][col] === 'in' ? '1' : '0');
    }
  }

  return {
    w: width,
    h: height,
    v: vertexTypes.join(''),
    he: hEdges.join(''),
    ve: vEdges.join(''),
  };
}

/**
 * Deserialize a compact lattice state back to full format
 */
export function deserializeLatticeState(compact: CompactLatticeState): LatticeState {
  const { w: width, h: height, v: vertexString, he: hEdgeString, ve: vEdgeString } = compact;

  // Reconstruct vertices
  const vertices: Vertex[][] = [];
  let vIndex = 0;

  for (let row = 0; row < height; row++) {
    vertices[row] = [];
    for (let col = 0; col < width; col++) {
      const type = charToVertexType(vertexString[vIndex++]);

      // We'll reconstruct the configuration from edges
      vertices[row][col] = {
        position: { row, col },
        type,
        configuration: {
          left: 'out' as EdgeState, // Will be set properly below
          right: 'out' as EdgeState,
          top: 'out' as EdgeState,
          bottom: 'out' as EdgeState,
        },
      };
    }
  }

  // Reconstruct horizontal edges
  const horizontalEdges: EdgeState[][] = [];
  let hIndex = 0;

  for (let row = 0; row < height; row++) {
    horizontalEdges[row] = [];
    for (let col = 0; col < width; col++) {
      horizontalEdges[row][col] = hEdgeString[hIndex++] === '1' ? 'in' : 'out';
    }
  }

  // Reconstruct vertical edges
  const verticalEdges: EdgeState[][] = [];
  let vEdgeIndex = 0;

  for (let row = 0; row < height; row++) {
    verticalEdges[row] = [];
    for (let col = 0; col < width; col++) {
      verticalEdges[row][col] = vEdgeString[vEdgeIndex++] === '1' ? 'in' : 'out';
    }
  }

  // Now update vertex configurations based on edges
  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      const vertex = vertices[row][col];

      // Right edge
      vertex.configuration.right = horizontalEdges[row][col];

      // Left edge (from the vertex to the left)
      const leftCol = (col - 1 + width) % width;
      vertex.configuration.left = horizontalEdges[row][leftCol] === 'in' ? 'out' : 'in';

      // Bottom edge
      vertex.configuration.bottom = verticalEdges[row][col];

      // Top edge (from the vertex above)
      const topRow = (row - 1 + height) % height;
      vertex.configuration.top = verticalEdges[topRow][col] === 'in' ? 'out' : 'in';
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
 * Map vertex type to single character
 */
function vertexTypeToChar(type: VertexType): string {
  const map: Record<VertexType, string> = {
    a1: '1',
    a2: '2',
    b1: '3',
    b2: '4',
    c1: '5',
    c2: '6',
  };
  return map[type] || '0';
}

/**
 * Map character back to vertex type
 */
function charToVertexType(char: string): VertexType {
  const map: Record<string, VertexType> = {
    '1': 'a1',
    '2': 'a2',
    '3': 'b1',
    '4': 'b2',
    '5': 'c1',
    '6': 'c2',
  };
  return map[char] || 'a1';
}

/**
 * Serialize simulation data for storage
 */
export function serializeSimulationData(
  data: SimulationData,
  useCompression: boolean = true,
): string {
  // Create a compact representation
  const compact = {
    lattice: serializeLatticeState(data.latticeState),
    params: data.params,
    stats: data.stats,
  };

  // Compress if requested and data is large enough
  if (useCompression && shouldCompress(compact)) {
    return compress(compact);
  }

  return JSON.stringify(compact);
}

/**
 * Deserialize simulation data from storage
 */
export function deserializeSimulationData(
  serialized: string,
  wasCompressed: boolean = true,
): SimulationData | null {
  try {
    let compact: any;

    if (wasCompressed) {
      compact = decompress(serialized);
    } else {
      compact = JSON.parse(serialized);
    }

    if (!compact) {
      return null;
    }

    return {
      latticeState: deserializeLatticeState(compact.lattice),
      params: compact.params,
      stats: compact.stats,
    };
  } catch (error) {
    console.error('Failed to deserialize simulation data:', error);
    return null;
  }
}

/**
 * Calculate a checksum for data integrity
 */
export function calculateChecksum(data: any): string {
  const str = JSON.stringify(data);
  let hash = 0;

  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }

  return Math.abs(hash).toString(16);
}

/**
 * Validate checksum
 */
export function validateChecksum(data: any, checksum: string): boolean {
  return calculateChecksum(data) === checksum;
}
