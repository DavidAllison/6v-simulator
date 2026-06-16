/**
 * Versioned import/export format for 6-vertex lattice configurations.
 *
 * The lattice is stored compactly as base64 of a byte-per-vertex numeric type
 * array (a1=0 … c2=5), so a 1024×1024 lattice serializes to ~1.4 MB of text
 * instead of millions of JSON objects. Round-trips exactly.
 */

import type { SimulationData } from '../storage';
import type { LatticeState, SimulationParams, VertexType, Vertex } from './types';
import { getVertexConfiguration } from './types';

export const SIXV_FORMAT = '6v-lattice';
export const SIXV_VERSION = 1;

// Numeric vertex ids ↔ VertexType, matching cStyleFlipLogic (a1=0 … c2=5).
const NUM_TO_TYPE: VertexType[] = ['a1', 'a2', 'b1', 'b2', 'c1', 'c2'] as VertexType[];
const TYPE_TO_NUM: Record<string, number> = { a1: 0, a2: 1, b1: 2, b2: 3, c1: 4, c2: 5 };

export interface SixVFile {
  format: typeof SIXV_FORMAT;
  version: number;
  width: number;
  height: number;
  params: SimulationParams;
  /** base64 of a Uint8Array, row-major, one numeric vertex type per cell. */
  vertices: string;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunk = 0x8000; // avoid call-stack overflow on large arrays
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

/** Flatten a LatticeState's vertex types into a row-major byte array. */
function latticeToBytes(state: LatticeState): Uint8Array {
  const { width, height, vertices } = state;
  const bytes = new Uint8Array(width * height);
  for (let r = 0; r < height; r++) {
    for (let c = 0; c < width; c++) {
      bytes[r * width + c] = TYPE_TO_NUM[vertices[r][c].type] ?? 0;
    }
  }
  return bytes;
}

/** Rebuild a LatticeState (object form) from a row-major byte array. */
function bytesToLattice(bytes: Uint8Array, width: number, height: number): LatticeState {
  const vertices: Vertex[][] = [];
  for (let r = 0; r < height; r++) {
    const row: Vertex[] = [];
    for (let c = 0; c < width; c++) {
      const type = NUM_TO_TYPE[bytes[r * width + c]] ?? NUM_TO_TYPE[0];
      row.push({ position: { row: r, col: c }, type, configuration: getVertexConfiguration(type) });
    }
    vertices.push(row);
  }
  return { width, height, vertices, horizontalEdges: [], verticalEdges: [] };
}

/** Serialize the current simulation to the portable, versioned file object. */
export function serializeSimulation(data: SimulationData): SixVFile {
  const { latticeState, params } = data;
  return {
    format: SIXV_FORMAT,
    version: SIXV_VERSION,
    width: latticeState.width,
    height: latticeState.height,
    params,
    vertices: bytesToBase64(latticeToBytes(latticeState)),
  };
}

/** Pretty-printed JSON string for download / clipboard. */
export function serializeToJson(data: SimulationData): string {
  return JSON.stringify(serializeSimulation(data), null, 2);
}

export class SixVParseError extends Error {}

/** Parse + validate a file object back into SimulationData. Throws SixVParseError. */
export function deserializeSimulation(input: unknown): SimulationData {
  let obj: unknown = input;
  if (typeof input === 'string') {
    try {
      obj = JSON.parse(input);
    } catch {
      throw new SixVParseError('File is not valid JSON.');
    }
  }
  const file = obj as Partial<SixVFile>;
  if (!file || file.format !== SIXV_FORMAT) {
    throw new SixVParseError('Not a 6-vertex lattice file.');
  }
  if (file.version !== SIXV_VERSION) {
    throw new SixVParseError(
      `Unsupported file version ${String(file.version)} (this build reads version ${SIXV_VERSION}).`,
    );
  }
  if (
    typeof file.width !== 'number' ||
    typeof file.height !== 'number' ||
    typeof file.vertices !== 'string' ||
    !file.params
  ) {
    throw new SixVParseError('File is missing required fields.');
  }
  const bytes = base64ToBytes(file.vertices);
  if (bytes.length !== file.width * file.height) {
    throw new SixVParseError('Vertex data length does not match width × height.');
  }
  const latticeState = bytesToLattice(bytes, file.width, file.height);
  return {
    latticeState,
    params: file.params,
    stats: {
      step: 0,
      energy: 0,
      vertexCounts: { a1: 0, a2: 0, b1: 0, b2: 0, c1: 0, c2: 0 },
      acceptanceRate: 0,
      flipAttempts: 0,
      successfulFlips: 0,
      beta: file.params.beta,
    },
  };
}

/** Export the vertex-type grid as CSV (N rows of comma-separated type names). */
export function simulationToCsv(data: SimulationData): string {
  const { latticeState } = data;
  const lines: string[] = [];
  for (let r = 0; r < latticeState.height; r++) {
    lines.push(latticeState.vertices[r].map((v) => v.type).join(','));
  }
  return lines.join('\n');
}
