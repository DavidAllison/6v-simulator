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

  // The Web Worker boundary relies on two engine guarantees: setState() adopts an
  // external Int8Array exactly, and getRawState() returns a FRESH copy (so the
  // engine keeps ownership when the worker transfers its buffer). We verify those
  // semantics directly here; the worker message wiring itself (import.meta.url,
  // transferables) is verified in-browser since ts-jest cannot load the worker.
  it('setState + getRawState round-trips exactly and returns a fresh copy', () => {
    const N = 16;
    const sim = new OptimizedPhysicsSimulation({ size: N, weights: WEIGHTS, seed: 99 });

    // Build a valid configuration to import (use a fresh engine's DWBC-low state).
    const source = new OptimizedPhysicsSimulation({
      size: N,
      weights: WEIGHTS,
      seed: 1,
      initialState: 'dwbc-low',
    });
    const imported = source.getRawState();

    sim.setState(imported);
    const after = sim.getRawState();

    expect(after.length).toBe(imported.length);
    for (let i = 0; i < imported.length; i++) {
      expect(after[i]).toBe(imported[i]);
    }

    // getRawState() must be a copy: mutating it must not corrupt engine state,
    // which is what makes transferring the returned buffer safe in the worker.
    after[0] = (after[0] + 1) % 6;
    const again = sim.getRawState();
    expect(again[0]).toBe(imported[0]);
    expect(again[0]).not.toBe(after[0]);
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
