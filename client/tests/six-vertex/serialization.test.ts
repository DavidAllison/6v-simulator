import { describe, it, expect } from '@jest/globals';
// serialization.ts only imports types + getVertexConfiguration from ./types and a
// type-only SimulationData from ../storage, so (unlike the facade) it is safe to
// import directly under ts-jest. We build lattices via the engine.
import { OptimizedPhysicsSimulation } from '../../src/lib/six-vertex/optimizedSimulation';
import {
  serializeSimulation,
  serializeToJson,
  deserializeSimulation,
  simulationToCsv,
  SixVParseError,
  SIXV_FORMAT,
  SIXV_VERSION,
} from '../../src/lib/six-vertex/serialization';
import type { SimulationData } from '../../src/lib/storage';
import type { SimulationParams } from '../../src/lib/six-vertex/types';

const WEIGHTS = { a1: 1, a2: 1, b1: 1, b2: 1, c1: 1, c2: 1 };

function makeData(size: number, seed = 999, steps = 0): SimulationData {
  const sim = new OptimizedPhysicsSimulation({ size, weights: WEIGHTS, seed });
  for (let i = 0; i < steps; i++) sim.step();
  const params: SimulationParams = {
    temperature: 1,
    beta: 1,
    weights: WEIGHTS,
    boundaryCondition: 'dwbc',
    seed,
  };
  return {
    latticeState: sim.getState(),
    params,
    stats: sim.getStats() as SimulationData['stats'],
  };
}

describe('serialization round-trip', () => {
  it('preserves dimensions, params, and every vertex type', () => {
    const data = makeData(16, 7, 50);
    const restored = deserializeSimulation(serializeSimulation(data));

    expect(restored.latticeState.width).toBe(data.latticeState.width);
    expect(restored.latticeState.height).toBe(data.latticeState.height);
    expect(restored.params.seed).toBe(data.params.seed);
    expect(restored.params.boundaryCondition).toBe(data.params.boundaryCondition);

    for (let r = 0; r < data.latticeState.height; r++) {
      for (let c = 0; c < data.latticeState.width; c++) {
        expect(restored.latticeState.vertices[r][c].type).toBe(
          data.latticeState.vertices[r][c].type,
        );
      }
    }
  });

  it('round-trips through the pretty-printed JSON string form', () => {
    const data = makeData(24, 3, 100);
    const json = serializeToJson(data);
    expect(typeof json).toBe('string');
    const restored = deserializeSimulation(json);
    expect(restored.latticeState.width).toBe(24);
    expect(restored.latticeState.vertices[0][0].type).toBe(data.latticeState.vertices[0][0].type);
  });

  it('reconstructs each vertex with a matching configuration object', () => {
    const data = makeData(8);
    const restored = deserializeSimulation(serializeSimulation(data));
    const v = restored.latticeState.vertices[0][0];
    expect(v.configuration).toBeDefined();
    expect(v.position).toEqual({ row: 0, col: 0 });
  });
});

describe('serialization format guards', () => {
  it('stamps the canonical format and version', () => {
    const file = serializeSimulation(makeData(8));
    expect(file.format).toBe(SIXV_FORMAT);
    expect(file.version).toBe(SIXV_VERSION);
  });

  it('rejects non-6v files', () => {
    expect(() => deserializeSimulation({ format: 'something-else' })).toThrow(SixVParseError);
    expect(() => deserializeSimulation('not json at all {')).toThrow(SixVParseError);
  });

  it('rejects unsupported versions', () => {
    const file = serializeSimulation(makeData(8));
    expect(() => deserializeSimulation({ ...file, version: 999 })).toThrow(/version/i);
  });

  it('rejects missing required fields', () => {
    const file = serializeSimulation(makeData(8));
    const noWidth: Partial<typeof file> = { ...file };
    delete noWidth.width;
    expect(() => deserializeSimulation(noWidth)).toThrow(SixVParseError);
  });

  it('rejects vertex data whose length disagrees with width × height', () => {
    const file = serializeSimulation(makeData(8));
    expect(() => deserializeSimulation({ ...file, width: 9 })).toThrow(/length/i);
  });
});

describe('CSV export', () => {
  it('emits one row per lattice row with comma-separated type names', () => {
    const data = makeData(8);
    const csv = simulationToCsv(data);
    const lines = csv.split('\n');
    expect(lines).toHaveLength(8);
    for (const line of lines) {
      const cells = line.split(',');
      expect(cells).toHaveLength(8);
      for (const cell of cells) expect(['a1', 'a2', 'b1', 'b2', 'c1', 'c2']).toContain(cell);
    }
  });
});

describe('large-lattice base64 chunking', () => {
  it('round-trips a lattice large enough to exercise multi-chunk base64', () => {
    // 256×256 = 65536 bytes > the 0x8000 chunk size, so this covers the chunked
    // bytesToBase64 path that a naive String.fromCharCode(...all) would overflow.
    const data = makeData(256, 42, 5);
    const restored = deserializeSimulation(serializeSimulation(data));
    expect(restored.latticeState.width).toBe(256);
    expect(restored.latticeState.height).toBe(256);
    // spot-check a scattered set of cells
    for (const [r, c] of [
      [0, 0],
      [128, 200],
      [255, 255],
      [17, 240],
    ]) {
      expect(restored.latticeState.vertices[r][c].type).toBe(data.latticeState.vertices[r][c].type);
    }
  });
});
