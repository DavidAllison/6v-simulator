/**
 * Quick test script to verify the optimizations work
 * Run this in the browser console or as a module
 */

import { PhysicsSimulation } from './lib/six-vertex/physicsSimulation';
import {
  OptimizedPhysicsSimulation,
  benchmarkSimulation,
} from './lib/six-vertex/optimizedSimulation';

export function runQuickTest() {
  console.log('=== 6-Vertex Model Optimization Test ===\n');

  // Test configurations
  const testSizes = [8, 16, 24, 32, 50];
  const steps = 1000;

  console.log(`Testing with ${steps} steps per size\n`);

  for (const size of testSizes) {
    console.log(`\nSize: ${size}x${size}`);
    console.log('-'.repeat(40));

    // Test original implementation (skip for large sizes)
    if (size <= 24) {
      const startOriginal = performance.now();
      const original = new PhysicsSimulation({
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
      });
      original.run(steps);
      const endOriginal = performance.now();
      const originalTime = endOriginal - startOriginal;
      const originalSPS = (steps / originalTime) * 1000;

      console.log(`Original:  ${originalTime.toFixed(2)}ms (${originalSPS.toFixed(0)} steps/sec)`);
    }

    // Test optimized implementation
    const result = benchmarkSimulation(size, steps);
    console.log(
      `Optimized: ${result.timeMs.toFixed(2)}ms (${result.stepsPerSecond.toFixed(0)} steps/sec)`,
    );

    // Calculate theoretical FPS
    const stepsPerFrame = size <= 24 ? 200 : size <= 50 ? 100 : 50;
    const theoreticalFPS = result.stepsPerSecond / stepsPerFrame;
    console.log(`Theoretical FPS: ${theoreticalFPS.toFixed(1)}`);

    // Check if target is met
    let target = 10;
    if (size <= 24) target = 60;
    else if (size <= 50) target = 30;

    const meetsTarget = theoreticalFPS >= target;
    console.log(`Target: ${target} FPS - ${meetsTarget ? '✓ PASS' : '✗ FAIL'}`);

    // Show flippable list efficiency
    if (result.stats.flippableCount !== undefined) {
      const efficiency = (result.stats.flippableCount / (size * size)) * 100;
      console.log(
        `Flippable positions: ${result.stats.flippableCount} (${efficiency.toFixed(1)}% of lattice)`,
      );
    }
  }

  console.log('\n=== Test Complete ===');
}

// Auto-run if this is the main module
if (import.meta.url === new URL(import.meta.url).href) {
  runQuickTest();
}

// Export for use in browser console
(window as any).runOptimizationTest = runQuickTest;
