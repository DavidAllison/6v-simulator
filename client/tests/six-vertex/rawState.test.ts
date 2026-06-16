import { describe, it, expect } from '@jest/globals';
// Test the engine directly (OptimizedPhysicsSimulation) rather than the
// MonteCarloSimulation facade: the facade transitively imports the Web Worker
// module, whose import.meta.url is incompatible with the ts-jest module target.
import { OptimizedPhysicsSimulation } from '../../src/lib/six-vertex/optimizedSimulation';
import { paintLatticeBitmap, vertexTypeRgb } from '../../src/lib/six-vertex/renderer/latticeBitmap';

// Numeric vertex ids -> VertexType string, matching cStyleFlipLogic (a1=0..c2=5).
const NUM_TO_TYPE = ['a1', 'a2', 'b1', 'b2', 'c1', 'c2'];
const WEIGHTS = { a1: 1, a2: 1, b1: 1, b2: 1, c1: 1, c2: 1 };

describe('getRawState (typed-array snapshot)', () => {
  it('returns a flat row-major Int8Array whose ids match getState() vertex types', () => {
    const sim = new OptimizedPhysicsSimulation({ size: 16, weights: WEIGHTS, seed: 12345 });

    const raw = sim.getRawState();
    expect(raw.length).toBe(16 * 16);
    expect(sim.getSize()).toBe(16);

    const state = sim.getState();
    for (let row = 0; row < state.height; row++) {
      for (let col = 0; col < state.width; col++) {
        const id = raw[row * state.width + col];
        expect(NUM_TO_TYPE[id]).toBe(state.vertices[row][col].type);
      }
    }
  });

  it('all ids are valid vertex types (0..5) and DWBC-high anti-diagonal is c2', () => {
    const N = 24;
    const sim = new OptimizedPhysicsSimulation({
      size: N,
      weights: WEIGHTS,
      seed: 1,
      initialState: 'dwbc-high',
    });
    const raw = sim.getRawState();
    for (let i = 0; i < raw.length; i++) {
      expect(raw[i]).toBeGreaterThanOrEqual(0);
      expect(raw[i]).toBeLessThanOrEqual(5);
    }
    // DWBC-high places c2 (id 5) on the anti-diagonal (row + col === N - 1).
    for (let r = 0; r < N; r++) {
      const c = N - 1 - r;
      expect(NUM_TO_TYPE[raw[r * N + c]]).toBe('c2');
    }
  });

  it('handles large lattices (1024) and stays consistent after stepping', () => {
    const N = 1024;
    const sim = new OptimizedPhysicsSimulation({ size: N, weights: WEIGHTS, seed: 7 });
    const raw = sim.getRawState();
    expect(raw.length).toBe(N * N);
    sim.run(500);
    const raw2 = sim.getRawState();
    expect(raw2.length).toBe(N * N);
    for (let i = 0; i < raw2.length; i += 4096) {
      expect(raw2[i]).toBeGreaterThanOrEqual(0);
      expect(raw2[i]).toBeLessThanOrEqual(5);
    }
  });
});

describe('latticeBitmap', () => {
  it('maps each numeric vertex type to a distinct RGB', () => {
    const seen = new Set<string>();
    for (let t = 0; t < 6; t++) {
      const [r, g, b] = vertexTypeRgb(t);
      seen.add(`${r},${g},${b}`);
    }
    expect(seen.size).toBe(6);
  });

  it('paints one pixel per vertex with the type colour', () => {
    let painted: ImageData | null = null;
    const ctx = {
      createImageData: (w: number, h: number) => ({
        width: w,
        height: h,
        data: new Uint8ClampedArray(w * h * 4),
        colorSpace: 'srgb' as PredefinedColorSpace,
      }),
      putImageData: (img: ImageData) => {
        painted = img;
      },
    } as unknown as CanvasRenderingContext2D;

    const vertices = Int8Array.from([0, 1, 2, 3]); // 2x2
    paintLatticeBitmap(ctx, 2, 2, vertices);

    expect(painted).not.toBeNull();
    const data = painted!.data;
    for (let i = 0; i < 4; i++) {
      const [r, g, b] = vertexTypeRgb(vertices[i]);
      expect([data[i * 4], data[i * 4 + 1], data[i * 4 + 2], data[i * 4 + 3]]).toEqual([
        r,
        g,
        b,
        255,
      ]);
    }
  });
});
