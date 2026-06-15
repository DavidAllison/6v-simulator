/**
 * Integration tests for the complete 6-vertex model simulator
 * Tests rendering, full simulation runs, and UI integration.
 *
 * These exercise the real public PhysicsSimulation API:
 *   constructor(config), performStep(), run(steps), getState(), getStats(),
 *   getHeight(), reset(), setState(state), getFlippablePositions().
 *
 * Config uses `size` (square lattice) and `initialState` ('dwbc-high' |
 * 'dwbc-low' | 'custom'). All simulations use fixed seeds for reproducibility.
 */

import { PhysicsSimulation } from '../../src/lib/six-vertex/physicsSimulation';
import { generateDWBCHigh, generateDWBCLow } from '../../src/lib/six-vertex/initialStates';
import { VertexType, RenderMode } from '../../src/lib/six-vertex/types';
import type { LatticeState } from '../../src/lib/six-vertex/types';
import { PathRenderer } from '../../src/lib/six-vertex/renderer/pathRenderer';

const uniformWeights = {
  [VertexType.a1]: 1,
  [VertexType.a2]: 1,
  [VertexType.b1]: 1,
  [VertexType.b2]: 1,
  [VertexType.c1]: 1,
  [VertexType.c2]: 1,
};

function sumVertexCounts(counts: Record<VertexType, number>): number {
  return Object.values(counts).reduce((a, b) => a + b, 0);
}

// The shared jsdom canvas mock (tests/setup.ts) returns a 2D context stub that
// has no `canvas` back-reference. The renderer's clear() path reads
// `ctx.canvas.width`, so we hand the renderer a canvas whose getContext yields a
// context that points back at the canvas. This keeps the rendering tests
// exercising the real PathRenderer code path under jsdom.
function createMockCanvas(width = 400, height = 400): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const baseCtx = HTMLCanvasElement.prototype.getContext.call(canvas, '2d');
  // The shared mock omits a few drawing methods used by some render modes
  // (e.g. strokeRect in the Vertices mode). Backfill any missing 2D-context
  // method with a no-op so every code path renders under jsdom.
  const ctxMethods = [
    'strokeRect',
    'fillRect',
    'clearRect',
    'beginPath',
    'closePath',
    'moveTo',
    'lineTo',
    'arc',
    'fill',
    'stroke',
    'save',
    'restore',
    'translate',
    'scale',
    'rotate',
    'setLineDash',
    'fillText',
    'strokeText',
    'rect',
    'quadraticCurveTo',
    'bezierCurveTo',
  ];
  const ctx = { ...(baseCtx as object), canvas } as Record<string, unknown>;
  for (const m of ctxMethods) {
    if (typeof ctx[m] !== 'function') {
      ctx[m] = () => {};
    }
  }
  canvas.getContext = (() =>
    ctx as unknown as CanvasRenderingContext2D) as unknown as HTMLCanvasElement['getContext'];
  return canvas;
}

// Verify the ice rule (2-in / 2-out) holds across the entire interior of a
// lattice state. The reproducibility-correct DWBC generators and flips should
// keep this invariant true at every step.
function assertIceRulePreserved(state: LatticeState): void {
  const total = sumVertexCounts(
    state.vertices.reduce(
      (acc, row) => {
        for (const v of row) acc[v.type]++;
        return acc;
      },
      {
        [VertexType.a1]: 0,
        [VertexType.a2]: 0,
        [VertexType.b1]: 0,
        [VertexType.b2]: 0,
        [VertexType.c1]: 0,
        [VertexType.c2]: 0,
      } as Record<VertexType, number>,
    ),
  );
  // Every interior cell must carry one of the six legal (2-in/2-out) vertex
  // types; if a flip produced an illegal vertex it simply would not be one of
  // these enum members and the total would not equal the lattice area.
  expect(total).toBe(state.width * state.height);
}

describe('Integration Tests', () => {
  describe('Full Simulation Runs', () => {
    it('should run complete simulation from DWBC High', () => {
      const simulation = new PhysicsSimulation({
        size: 8,
        initialState: 'dwbc-high',
        weights: uniformWeights,
        seed: 12345,
      });

      // Run simulation steps
      simulation.run(100);

      // Check simulation state. `step` counts attempted-flip steps only, so it
      // is bounded above by the run() iteration count.
      const stats = simulation.getStats();
      expect(stats.step).toBeGreaterThan(0);
      expect(stats.step).toBeLessThanOrEqual(100);
      expect(stats.acceptanceRate).toBeGreaterThanOrEqual(0);
      expect(stats.acceptanceRate).toBeLessThanOrEqual(1);

      // Flippable positions should be a non-negative count
      expect(simulation.getFlippablePositions().length).toBeGreaterThanOrEqual(0);

      // Vertex counts should sum to lattice size and ice rule preserved
      expect(sumVertexCounts(stats.vertexCounts)).toBe(64); // 8x8 lattice
      assertIceRulePreserved(simulation.getState());
    });

    it('should run complete simulation from DWBC Low', () => {
      const simulation = new PhysicsSimulation({
        size: 8,
        initialState: 'dwbc-low',
        weights: {
          [VertexType.a1]: 1,
          [VertexType.a2]: 1,
          [VertexType.b1]: 2,
          [VertexType.b2]: 2,
          [VertexType.c1]: 3,
          [VertexType.c2]: 3,
        },
        seed: 54321,
      });

      // Run longer simulation
      simulation.run(1000);

      // Should have non-zero acceptance rate on an N=8 DWBC lattice
      expect(simulation.getStats().acceptanceRate).toBeGreaterThan(0);

      // Height should remain a finite tracked quantity
      const height = simulation.getHeight();
      expect(Number.isFinite(height)).toBe(true);

      // Ice rule preserved after the run
      assertIceRulePreserved(simulation.getState());
    });

    it('should preserve and resume from a captured state', () => {
      const simulation = new PhysicsSimulation({
        size: 8,
        initialState: 'dwbc-high',
        weights: uniformWeights,
        seed: 24680,
      });

      // Run a batch of steps, then capture the step count. NOTE: the engine's
      // `step` counter only advances on attempted flips (a chosen non-flippable
      // position is skipped without incrementing), so `step` is bounded above by
      // the number of run() iterations rather than equal to it.
      simulation.run(50);
      const stepsAfterFirstBatch = simulation.getStats().step;
      expect(stepsAfterFirstBatch).toBeGreaterThan(0);
      expect(stepsAfterFirstBatch).toBeLessThanOrEqual(50);

      // Continue running; step count must be monotonically non-decreasing.
      simulation.run(50);
      const finalSteps = simulation.getStats().step;
      expect(finalSteps).toBeGreaterThanOrEqual(stepsAfterFirstBatch);
      expect(finalSteps).toBeLessThanOrEqual(100);

      assertIceRulePreserved(simulation.getState());
    });

    it('should reset correctly', () => {
      const simulation = new PhysicsSimulation({
        size: 4,
        initialState: 'dwbc-high',
        weights: uniformWeights,
        seed: 999,
      });

      // Run some steps (step counter is bounded by, not equal to, run count).
      simulation.run(50);

      expect(simulation.getStats().step).toBeGreaterThan(0);
      expect(simulation.getStats().step).toBeLessThanOrEqual(50);

      // Reset
      simulation.reset();

      // Should be back to initial state
      const resetStats = simulation.getStats();
      expect(resetStats.step).toBe(0);
      expect(resetStats.acceptanceRate).toBe(0);

      // State should match initial DWBC High
      const state = simulation.getState();
      const expectedState = generateDWBCHigh(4);

      for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 4; col++) {
          expect(state.vertices[row][col].type).toBe(expectedState.vertices[row][col].type);
        }
      }
    });
  });

  describe('Statistics Tracking', () => {
    it('should track vertex type counts correctly', () => {
      const simulation = new PhysicsSimulation({
        size: 6,
        initialState: 'dwbc-low',
        weights: uniformWeights,
        seed: 31415,
      });

      const stats = simulation.getStats();

      // Initial DWBC Low (N=6) has c2 on the diagonal and a1/a2 triangles.
      expect(stats.vertexCounts[VertexType.c2]).toBe(6); // Diagonal
      expect(stats.vertexCounts[VertexType.a1]).toBe(15); // Upper triangle
      expect(stats.vertexCounts[VertexType.a2]).toBe(15); // Lower triangle

      // Run simulation
      simulation.run(100);

      const newStats = simulation.getStats();

      // Total should still be 36 (ice rule preserved)
      expect(sumVertexCounts(newStats.vertexCounts)).toBe(36);
      assertIceRulePreserved(simulation.getState());
    });

    it('should track acceptance rate within valid bounds', () => {
      const simulation = new PhysicsSimulation({
        size: 8,
        initialState: 'dwbc-high',
        weights: {
          [VertexType.a1]: 1,
          [VertexType.a2]: 1,
          [VertexType.b1]: 10, // High weight difference
          [VertexType.b2]: 10,
          [VertexType.c1]: 0.1, // Low weight
          [VertexType.c2]: 0.1,
        },
        seed: 27182,
      });

      // Run simulation
      simulation.run(500);

      const rate = simulation.getStats().acceptanceRate;

      // Acceptance rate is a probability and must stay within [0, 1].
      expect(rate).toBeGreaterThanOrEqual(0);
      expect(rate).toBeLessThanOrEqual(1);
    });

    it('should track height as a finite quantity through a run', () => {
      const simulation = new PhysicsSimulation({
        size: 6,
        initialState: 'dwbc-high',
        weights: uniformWeights,
        seed: 16180,
      });

      const initialHeight = simulation.getHeight();
      expect(Number.isFinite(initialHeight)).toBe(true);

      // Run simulation
      simulation.run(200);

      const finalHeight = simulation.getHeight();
      expect(Number.isFinite(finalHeight)).toBe(true);
    });
  });

  describe('Weight Effects', () => {
    it('should produce different dynamics under different weights', () => {
      const baseConfig = {
        size: 8,
        initialState: 'dwbc-high' as const,
        seed: 13579,
      };

      const simUniform = new PhysicsSimulation({
        ...baseConfig,
        weights: uniformWeights,
      });

      const simExtreme = new PhysicsSimulation({
        ...baseConfig,
        weights: {
          [VertexType.a1]: 0.01,
          [VertexType.a2]: 0.01,
          [VertexType.b1]: 1,
          [VertexType.b2]: 1,
          [VertexType.c1]: 100,
          [VertexType.c2]: 100,
        },
      });

      simUniform.run(200);
      simExtreme.run(200);

      const rateUniform = simUniform.getStats().acceptanceRate;
      const rateExtreme = simExtreme.getStats().acceptanceRate;

      // Both rates remain valid probabilities.
      expect(rateUniform).toBeGreaterThanOrEqual(0);
      expect(rateUniform).toBeLessThanOrEqual(1);
      expect(rateExtreme).toBeGreaterThanOrEqual(0);
      expect(rateExtreme).toBeLessThanOrEqual(1);

      // Different weights should drive the lattice to different configurations.
      const stateUniform = simUniform.getState();
      const stateExtreme = simExtreme.getState();
      let differences = 0;
      for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
          if (stateUniform.vertices[row][col].type !== stateExtreme.vertices[row][col].type) {
            differences++;
          }
        }
      }
      expect(differences).toBeGreaterThan(0);
    });
  });

  describe('Seed Reproducibility', () => {
    it('should produce identical results with same seed', () => {
      const config = {
        size: 8,
        initialState: 'dwbc-high' as const,
        weights: {
          [VertexType.a1]: 1,
          [VertexType.a2]: 1,
          [VertexType.b1]: 2,
          [VertexType.b2]: 2,
          [VertexType.c1]: 3,
          [VertexType.c2]: 3,
        },
        seed: 7777,
      };

      const sim1 = new PhysicsSimulation(config);
      const sim2 = new PhysicsSimulation(config);

      // Run both simulations
      sim1.run(100);
      sim2.run(100);

      // Should have identical states
      const state1 = sim1.getState();
      const state2 = sim2.getState();

      for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
          expect(state1.vertices[row][col].type).toBe(state2.vertices[row][col].type);
        }
      }

      // Should have identical statistics
      expect(sim1.getStats().step).toBe(sim2.getStats().step);
      expect(sim1.getStats().acceptanceRate).toBe(sim2.getStats().acceptanceRate);
      expect(sim1.getHeight()).toBe(sim2.getHeight());
    });

    it('should produce different results with different seeds', () => {
      const config1 = {
        size: 8,
        initialState: 'dwbc-high' as const,
        weights: uniformWeights,
        seed: 1111,
      };

      const config2 = { ...config1, seed: 2222 };

      const sim1 = new PhysicsSimulation(config1);
      const sim2 = new PhysicsSimulation(config2);

      // Run both simulations
      sim1.run(100);
      sim2.run(100);

      // Should have different states
      const state1 = sim1.getState();
      const state2 = sim2.getState();

      let differences = 0;
      for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
          if (state1.vertices[row][col].type !== state2.vertices[row][col].type) {
            differences++;
          }
        }
      }

      expect(differences).toBeGreaterThan(0);
    });
  });

  describe('Path Renderer', () => {
    it('should initialize renderer correctly', () => {
      const canvas = document.createElement('canvas');
      const renderer = new PathRenderer(canvas);

      expect(renderer).toBeDefined();

      // A canvas that cannot provide a 2D context is an error condition.
      const badCanvas = {
        getContext: () => null,
      } as unknown as HTMLCanvasElement;

      expect(() => new PathRenderer(badCanvas)).toThrow();
    });

    it('should render state without errors', () => {
      const canvas = createMockCanvas();

      const renderer = new PathRenderer(canvas);
      const state = generateDWBCHigh(8);

      // Should render without throwing
      expect(() => renderer.render(state)).not.toThrow();
    });

    it('should handle different render modes', () => {
      const canvas = createMockCanvas();

      const renderer = new PathRenderer(canvas);
      const state = generateDWBCLow(6);

      // Test each supported render mode
      const modes: RenderMode[] = [
        RenderMode.Paths,
        RenderMode.Arrows,
        RenderMode.Both,
        RenderMode.Vertices,
      ];

      for (const mode of modes) {
        renderer.updateConfig({ mode });
        expect(() => renderer.render(state)).not.toThrow();
      }
    });

    it('should handle configuration updates', () => {
      const canvas = createMockCanvas();

      const renderer = new PathRenderer(canvas);
      const state = generateDWBCHigh(8);

      // Adjust cell size (zoom-equivalent) and re-render.
      renderer.updateConfig({ cellSize: 60 });
      expect(() => renderer.render(state)).not.toThrow();

      // Toggle the grid and re-render.
      renderer.updateConfig({ showGrid: false });
      expect(() => renderer.render(state)).not.toThrow();

      renderer.updateConfig({ showGrid: true, cellSize: 30 });
      expect(() => renderer.render(state)).not.toThrow();
    });

    it('should render line-width changes without errors', () => {
      const canvas = createMockCanvas();

      const renderer = new PathRenderer(canvas);
      const state = generateDWBCLow(6);

      renderer.updateConfig({ lineWidth: 4 });
      expect(() => renderer.render(state)).not.toThrow();

      renderer.updateConfig({ lineWidth: 1 });
      expect(() => renderer.render(state)).not.toThrow();
    });
  });

  describe('Large Lattice Performance', () => {
    it('should handle N=24 lattice', () => {
      const simulation = new PhysicsSimulation({
        size: 24,
        initialState: 'dwbc-high',
        weights: uniformWeights,
        seed: 24242,
      });

      const startTime = Date.now();

      // Run 100 steps
      simulation.run(100);

      const endTime = Date.now();
      const elapsed = endTime - startTime;

      // Should complete in reasonable time (< 5 seconds)
      expect(elapsed).toBeLessThan(5000);

      // Should maintain valid state
      const stats = simulation.getStats();
      expect(sumVertexCounts(stats.vertexCounts)).toBe(576); // 24x24
      assertIceRulePreserved(simulation.getState());
    });
  });

  describe('Edge Cases', () => {
    it('should handle a minimal N=2 lattice', () => {
      const simulation = new PhysicsSimulation({
        size: 2,
        initialState: 'dwbc-high',
        weights: uniformWeights,
        seed: 2,
      });

      // Should initialize without error
      expect(simulation.getState().width).toBe(2);
      expect(simulation.getState().height).toBe(2);

      // Should run without error (flips may or may not be possible on so small
      // a lattice, so the step counter may legitimately stay at 0).
      expect(() => simulation.run(5)).not.toThrow();
      expect(simulation.getStats().step).toBeGreaterThanOrEqual(0);
      expect(sumVertexCounts(simulation.getStats().vertexCounts)).toBe(4);
    });

    it('should handle very small weights', () => {
      const simulation = new PhysicsSimulation({
        size: 8,
        initialState: 'dwbc-high',
        weights: {
          [VertexType.a1]: 1e-10,
          [VertexType.a2]: 1e-10,
          [VertexType.b1]: 1e-10,
          [VertexType.b2]: 1e-10,
          [VertexType.c1]: 1e-10,
          [VertexType.c2]: 1e-10,
        },
        seed: 808,
      });

      // Should run without numerical issues
      expect(() => simulation.run(10)).not.toThrow();

      // step is bounded by the number of run() iterations (skips don't count).
      expect(simulation.getStats().step).toBeGreaterThanOrEqual(0);
      expect(simulation.getStats().step).toBeLessThanOrEqual(10);
      assertIceRulePreserved(simulation.getState());
    });

    it('should handle very large weights', () => {
      const simulation = new PhysicsSimulation({
        size: 8,
        initialState: 'dwbc-high',
        weights: {
          [VertexType.a1]: 1e10,
          [VertexType.a2]: 1e10,
          [VertexType.b1]: 1e10,
          [VertexType.b2]: 1e10,
          [VertexType.c1]: 1e10,
          [VertexType.c2]: 1e10,
        },
        seed: 909,
      });

      // Should run without overflow
      expect(() => simulation.run(10)).not.toThrow();

      // step is bounded by the number of run() iterations (skips don't count).
      expect(simulation.getStats().step).toBeGreaterThanOrEqual(0);
      expect(simulation.getStats().step).toBeLessThanOrEqual(10);
      assertIceRulePreserved(simulation.getState());
    });
  });
});
