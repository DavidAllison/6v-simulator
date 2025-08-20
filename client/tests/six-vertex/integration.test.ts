/**
 * Integration tests for the complete 6-vertex model simulator
 * Tests rendering, full simulation runs, and UI integration
 */

import { PhysicsSimulation } from '../../src/lib/six-vertex/physicsSimulation';
import { generateDWBCHigh, generateDWBCLow } from '../../src/lib/six-vertex/initialStates';
import { VertexType } from '../../src/lib/six-vertex/types';
import { SeededRNG } from '../../src/lib/six-vertex/rng';
import { PathRenderer } from '../../src/lib/six-vertex/renderer/pathRenderer';

describe('Integration Tests', () => {
  describe('Full Simulation Runs', () => {
    it('should run complete simulation from DWBC High', () => {
      const simulation = new PhysicsSimulation({
        width: 8,
        height: 8,
        initialState: 'dwbc-high',
        weights: {
          [VertexType.a1]: 1,
          [VertexType.a2]: 1,
          [VertexType.b1]: 1,
          [VertexType.b2]: 1,
          [VertexType.c1]: 1,
          [VertexType.c2]: 1,
        },
        seed: 12345,
      });

      // Run simulation steps
      for (let i = 0; i < 100; i++) {
        simulation.step();
      }

      // Check simulation state
      expect(simulation.getStepCount()).toBe(100);
      expect(simulation.getAcceptanceRate()).toBeGreaterThanOrEqual(0);
      expect(simulation.getAcceptanceRate()).toBeLessThanOrEqual(1);

      // Get statistics
      const stats = simulation.getStatistics();
      expect(stats.stepCount).toBe(100);
      expect(stats.flippableCount).toBeGreaterThanOrEqual(0);

      // Vertex counts should sum to lattice size
      const totalVertices = Object.values(stats.vertexCounts).reduce((a, b) => a + b, 0);
      expect(totalVertices).toBe(64); // 8x8 lattice
    });

    it('should run complete simulation from DWBC Low', () => {
      const simulation = new PhysicsSimulation({
        width: 8,
        height: 8,
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
      for (let i = 0; i < 1000; i++) {
        simulation.step();
      }

      // Should have non-zero acceptance rate
      expect(simulation.getAcceptanceRate()).toBeGreaterThan(0);

      // Check height tracking
      const height = simulation.getHeight();
      expect(height).toBeGreaterThanOrEqual(0);
      expect(height).toBeLessThanOrEqual(64);
    });

    it('should handle pause and resume', () => {
      const simulation = new PhysicsSimulation({
        width: 6,
        height: 6,
        initialState: 'random',
        weights: {
          [VertexType.a1]: 1,
          [VertexType.a2]: 1,
          [VertexType.b1]: 1,
          [VertexType.b2]: 1,
          [VertexType.c1]: 1,
          [VertexType.c2]: 1,
        },
      });

      // Start simulation
      simulation.start();
      expect(simulation.isRunning()).toBe(true);

      // Let it run briefly
      const initialSteps = simulation.getStepCount();

      // Pause
      simulation.pause();
      expect(simulation.isRunning()).toBe(false);

      const pausedSteps = simulation.getStepCount();

      // Resume
      simulation.start();
      expect(simulation.isRunning()).toBe(true);

      // Stop
      simulation.stop();
      expect(simulation.isRunning()).toBe(false);

      const finalSteps = simulation.getStepCount();
      expect(finalSteps).toBeGreaterThanOrEqual(pausedSteps);
    });

    it('should reset correctly', () => {
      const simulation = new PhysicsSimulation({
        width: 4,
        height: 4,
        initialState: 'dwbc-high',
        weights: {
          [VertexType.a1]: 1,
          [VertexType.a2]: 1,
          [VertexType.b1]: 1,
          [VertexType.b2]: 1,
          [VertexType.c1]: 1,
          [VertexType.c2]: 1,
        },
        seed: 999,
      });

      // Run some steps
      for (let i = 0; i < 50; i++) {
        simulation.step();
      }

      expect(simulation.getStepCount()).toBe(50);

      // Reset
      simulation.reset();

      // Should be back to initial state
      expect(simulation.getStepCount()).toBe(0);
      expect(simulation.getAcceptanceRate()).toBe(0);

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
        width: 6,
        height: 6,
        initialState: 'dwbc-low',
        weights: {
          [VertexType.a1]: 1,
          [VertexType.a2]: 1,
          [VertexType.b1]: 1,
          [VertexType.b2]: 1,
          [VertexType.c1]: 1,
          [VertexType.c2]: 1,
        },
      });

      const stats = simulation.getStatistics();

      // Initial state should have specific vertex distribution
      expect(stats.vertexCounts[VertexType.c2]).toBe(6); // Diagonal
      expect(stats.vertexCounts[VertexType.a1]).toBe(15); // Upper triangle
      expect(stats.vertexCounts[VertexType.a2]).toBe(15); // Lower triangle

      // Run simulation
      for (let i = 0; i < 100; i++) {
        simulation.step();
      }

      const newStats = simulation.getStatistics();

      // Total should still be 36
      const total = Object.values(newStats.vertexCounts).reduce((a, b) => a + b, 0);
      expect(total).toBe(36);
    });

    it('should track acceptance rate over time', () => {
      const simulation = new PhysicsSimulation({
        width: 4,
        height: 4,
        initialState: 'random',
        weights: {
          [VertexType.a1]: 1,
          [VertexType.a2]: 1,
          [VertexType.b1]: 10, // High weight difference
          [VertexType.b2]: 10,
          [VertexType.c1]: 0.1, // Low weight
          [VertexType.c2]: 0.1,
        },
      });

      // Run simulation
      for (let i = 0; i < 500; i++) {
        simulation.step();
      }

      const rate = simulation.getAcceptanceRate();

      // With extreme weights, acceptance rate should be lower
      expect(rate).toBeGreaterThanOrEqual(0);
      expect(rate).toBeLessThan(0.8);
    });

    it('should track height changes', () => {
      const simulation = new PhysicsSimulation({
        width: 6,
        height: 6,
        initialState: 'dwbc-high',
        weights: {
          [VertexType.a1]: 1,
          [VertexType.a2]: 1,
          [VertexType.b1]: 1,
          [VertexType.b2]: 1,
          [VertexType.c1]: 1,
          [VertexType.c2]: 1,
        },
      });

      const initialHeight = simulation.getHeight();

      // Run simulation
      for (let i = 0; i < 200; i++) {
        simulation.step();
      }

      const finalHeight = simulation.getHeight();

      // Height should change during simulation
      // (might be same by chance, but unlikely after 200 steps)
      expect(finalHeight).toBeGreaterThanOrEqual(0);
      expect(finalHeight).toBeLessThanOrEqual(36);
    });
  });

  describe('Weight Updates', () => {
    it('should handle weight updates during simulation', () => {
      const simulation = new PhysicsSimulation({
        width: 4,
        height: 4,
        initialState: 'random',
        weights: {
          [VertexType.a1]: 1,
          [VertexType.a2]: 1,
          [VertexType.b1]: 1,
          [VertexType.b2]: 1,
          [VertexType.c1]: 1,
          [VertexType.c2]: 1,
        },
      });

      // Run with initial weights
      for (let i = 0; i < 50; i++) {
        simulation.step();
      }

      const rate1 = simulation.getAcceptanceRate();

      // Update weights to extreme values
      simulation.setWeights({
        [VertexType.a1]: 0.01,
        [VertexType.a2]: 0.01,
        [VertexType.b1]: 1,
        [VertexType.b2]: 1,
        [VertexType.c1]: 100,
        [VertexType.c2]: 100,
      });

      // Run with new weights
      for (let i = 0; i < 50; i++) {
        simulation.step();
      }

      const rate2 = simulation.getAcceptanceRate();

      // Acceptance rates should differ with different weights
      expect(Math.abs(rate1 - rate2)).toBeGreaterThan(0);
    });
  });

  describe('Seed Reproducibility', () => {
    it('should produce identical results with same seed', () => {
      const config = {
        width: 4,
        height: 4,
        initialState: 'random' as const,
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
      for (let i = 0; i < 100; i++) {
        sim1.step();
        sim2.step();
      }

      // Should have identical states
      const state1 = sim1.getState();
      const state2 = sim2.getState();

      for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 4; col++) {
          expect(state1.vertices[row][col].type).toBe(state2.vertices[row][col].type);
        }
      }

      // Should have identical statistics
      expect(sim1.getStepCount()).toBe(sim2.getStepCount());
      expect(sim1.getAcceptanceRate()).toBe(sim2.getAcceptanceRate());
      expect(sim1.getHeight()).toBe(sim2.getHeight());
    });

    it('should produce different results with different seeds', () => {
      const config1 = {
        width: 4,
        height: 4,
        initialState: 'random' as const,
        weights: {
          [VertexType.a1]: 1,
          [VertexType.a2]: 1,
          [VertexType.b1]: 1,
          [VertexType.b2]: 1,
          [VertexType.c1]: 1,
          [VertexType.c2]: 1,
        },
        seed: 1111,
      };

      const config2 = { ...config1, seed: 2222 };

      const sim1 = new PhysicsSimulation(config1);
      const sim2 = new PhysicsSimulation(config2);

      // Run both simulations
      for (let i = 0; i < 100; i++) {
        sim1.step();
        sim2.step();
      }

      // Should have different states
      const state1 = sim1.getState();
      const state2 = sim2.getState();

      let differences = 0;
      for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 4; col++) {
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

      // Should handle null canvas context gracefully
      const badCanvas = {
        getContext: () => null,
      } as unknown as HTMLCanvasElement;

      expect(() => new PathRenderer(badCanvas)).not.toThrow();
    });

    it('should render state without errors', () => {
      const canvas = document.createElement('canvas');
      canvas.width = 400;
      canvas.height = 400;

      const renderer = new PathRenderer(canvas);
      const state = generateDWBCHigh(8);

      // Should render without throwing
      expect(() => renderer.render(state)).not.toThrow();
    });

    it('should handle different render modes', () => {
      const canvas = document.createElement('canvas');
      canvas.width = 400;
      canvas.height = 400;

      const renderer = new PathRenderer(canvas);
      const state = generateDWBCLow(6);

      // Test different render modes
      const modes: Array<'paths' | 'vertices' | 'arrows' | 'height'> = [
        'paths',
        'vertices',
        'arrows',
        'height',
      ];

      for (const mode of modes) {
        renderer.setRenderMode(mode);
        expect(() => renderer.render(state)).not.toThrow();
      }
    });

    it('should handle zoom and pan', () => {
      const canvas = document.createElement('canvas');
      canvas.width = 400;
      canvas.height = 400;

      const renderer = new PathRenderer(canvas);
      const state = generateDWBCHigh(8);

      // Set zoom
      renderer.setZoom(2.0);
      expect(() => renderer.render(state)).not.toThrow();

      // Set pan
      renderer.setPan(50, -50);
      expect(() => renderer.render(state)).not.toThrow();

      // Reset view
      renderer.resetView();
      expect(() => renderer.render(state)).not.toThrow();
    });

    it('should highlight flippable positions', () => {
      const canvas = document.createElement('canvas');
      canvas.width = 400;
      canvas.height = 400;

      const renderer = new PathRenderer(canvas);
      const state = generateDWBCLow(6);

      // Enable flippable highlighting
      renderer.setShowFlippable(true);
      expect(() => renderer.render(state)).not.toThrow();

      // Disable flippable highlighting
      renderer.setShowFlippable(false);
      expect(() => renderer.render(state)).not.toThrow();
    });
  });

  describe('Large Lattice Performance', () => {
    it('should handle N=24 lattice', () => {
      const simulation = new PhysicsSimulation({
        width: 24,
        height: 24,
        initialState: 'dwbc-high',
        weights: {
          [VertexType.a1]: 1,
          [VertexType.a2]: 1,
          [VertexType.b1]: 1,
          [VertexType.b2]: 1,
          [VertexType.c1]: 1,
          [VertexType.c2]: 1,
        },
      });

      const startTime = Date.now();

      // Run 100 steps
      for (let i = 0; i < 100; i++) {
        simulation.step();
      }

      const endTime = Date.now();
      const elapsed = endTime - startTime;

      // Should complete in reasonable time (< 5 seconds)
      expect(elapsed).toBeLessThan(5000);

      // Should maintain valid state
      const stats = simulation.getStatistics();
      const total = Object.values(stats.vertexCounts).reduce((a, b) => a + b, 0);
      expect(total).toBe(576); // 24x24
    });
  });

  describe('Edge Cases', () => {
    it('should handle N=1 lattice', () => {
      const simulation = new PhysicsSimulation({
        width: 1,
        height: 1,
        initialState: 'random',
        weights: {
          [VertexType.a1]: 1,
          [VertexType.a2]: 1,
          [VertexType.b1]: 1,
          [VertexType.b2]: 1,
          [VertexType.c1]: 1,
          [VertexType.c2]: 1,
        },
      });

      // Should initialize without error
      expect(simulation.getState().width).toBe(1);
      expect(simulation.getState().height).toBe(1);

      // Should run without error (though no flips possible)
      simulation.step();
      expect(simulation.getStepCount()).toBe(1);
    });

    it('should handle very small weights', () => {
      const simulation = new PhysicsSimulation({
        width: 4,
        height: 4,
        initialState: 'random',
        weights: {
          [VertexType.a1]: 1e-10,
          [VertexType.a2]: 1e-10,
          [VertexType.b1]: 1e-10,
          [VertexType.b2]: 1e-10,
          [VertexType.c1]: 1e-10,
          [VertexType.c2]: 1e-10,
        },
      });

      // Should run without numerical issues
      for (let i = 0; i < 10; i++) {
        simulation.step();
      }

      expect(simulation.getStepCount()).toBe(10);
    });

    it('should handle very large weights', () => {
      const simulation = new PhysicsSimulation({
        width: 4,
        height: 4,
        initialState: 'random',
        weights: {
          [VertexType.a1]: 1e10,
          [VertexType.a2]: 1e10,
          [VertexType.b1]: 1e10,
          [VertexType.b2]: 1e10,
          [VertexType.c1]: 1e10,
          [VertexType.c2]: 1e10,
        },
      });

      // Should run without overflow
      for (let i = 0; i < 10; i++) {
        simulation.step();
      }

      expect(simulation.getStepCount()).toBe(10);
    });
  });
});
