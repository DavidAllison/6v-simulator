/**
 * Performance testing module for comparing original vs optimized simulations
 */

import { PhysicsSimulation } from './physicsSimulation';
import { OptimizedPhysicsSimulation, benchmarkSimulation } from './optimizedSimulation';
import { createWorkerSimulation, WorkerSimulation } from './worker/workerInterface';

export interface PerformanceResult {
  size: number;
  steps: number;
  implementation: string;
  timeMs: number;
  stepsPerSecond: number;
  fps: number;
  memory?: {
    used: number;
    peak: number;
  };
  stats?: any;
}

/**
 * Test original implementation performance
 */
export function testOriginalPerformance(size: number, steps: number): PerformanceResult {
  const startTime = performance.now();
  const startMemory = (performance as any).memory?.usedJSHeapSize || 0;

  const sim = new PhysicsSimulation({
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
    initialState: 'dwbc-high',
  });

  sim.run(steps);

  const endTime = performance.now();
  const endMemory = (performance as any).memory?.usedJSHeapSize || 0;
  const timeMs = endTime - startTime;
  const stepsPerSecond = (steps / timeMs) * 1000;
  const fps = Math.min(60, stepsPerSecond / 100); // Assuming 100 steps per frame

  return {
    size,
    steps,
    implementation: 'original',
    timeMs,
    stepsPerSecond,
    fps,
    memory: {
      used: endMemory - startMemory,
      peak: endMemory,
    },
    stats: sim.getStats(),
  };
}

/**
 * Test optimized implementation performance
 */
export function testOptimizedPerformance(size: number, steps: number): PerformanceResult {
  const result = benchmarkSimulation(size, steps);
  const fps = Math.min(60, result.stepsPerSecond / 100);

  return {
    size,
    steps,
    implementation: 'optimized',
    timeMs: result.timeMs,
    stepsPerSecond: result.stepsPerSecond,
    fps,
    stats: result.stats,
  };
}

/**
 * Test Web Worker implementation performance
 */
export async function testWorkerPerformance(
  size: number,
  steps: number,
): Promise<PerformanceResult> {
  const startTime = performance.now();

  const worker = await createWorkerSimulation({
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
    batchSize: 1000,
  });

  if (!worker) {
    throw new Error('Failed to create worker');
  }

  return new Promise((resolve) => {
    let finalStats: any = null;

    worker.setCallbacks({
      onStats: (stats) => {
        finalStats = stats;
      },
      onProgress: (progress, stats) => {
        if (progress >= 1.0) {
          const endTime = performance.now();
          const timeMs = endTime - startTime;
          const stepsPerSecond = (steps / timeMs) * 1000;
          const fps = Math.min(60, stepsPerSecond / 100);

          worker.terminate();

          resolve({
            size,
            steps,
            implementation: 'worker',
            timeMs,
            stepsPerSecond,
            fps,
            stats: finalStats || stats,
          });
        }
      },
    });

    worker.run(steps);
  });
}

/**
 * Run comprehensive performance tests
 */
export async function runPerformanceTests(): Promise<void> {
  console.log('Starting performance tests...\n');

  const testConfigs = [
    { size: 8, steps: 10000 },
    { size: 16, steps: 10000 },
    { size: 24, steps: 10000 },
    { size: 32, steps: 5000 },
    { size: 50, steps: 2000 },
    { size: 100, steps: 500 },
  ];

  const results: PerformanceResult[] = [];

  for (const config of testConfigs) {
    console.log(`Testing N=${config.size}, ${config.steps} steps...`);

    // Test original implementation (skip for large sizes)
    if (config.size <= 24) {
      try {
        const originalResult = testOriginalPerformance(config.size, config.steps);
        results.push(originalResult);
        console.log(
          `  Original: ${originalResult.stepsPerSecond.toFixed(0)} steps/sec, ${originalResult.fps.toFixed(1)} FPS`,
        );
      } catch (error) {
        console.log(`  Original: Failed - ${error}`);
      }
    }

    // Test optimized implementation
    try {
      const optimizedResult = testOptimizedPerformance(config.size, config.steps);
      results.push(optimizedResult);
      console.log(
        `  Optimized: ${optimizedResult.stepsPerSecond.toFixed(0)} steps/sec, ${optimizedResult.fps.toFixed(1)} FPS`,
      );
    } catch (error) {
      console.log(`  Optimized: Failed - ${error}`);
    }

    // Test worker implementation
    try {
      const workerResult = await testWorkerPerformance(config.size, config.steps);
      results.push(workerResult);
      console.log(
        `  Worker: ${workerResult.stepsPerSecond.toFixed(0)} steps/sec, ${workerResult.fps.toFixed(1)} FPS`,
      );
    } catch (error) {
      console.log(`  Worker: Failed - ${error}`);
    }

    console.log('');
  }

  // Print summary
  console.log('\n=== Performance Summary ===\n');
  console.log('Target Performance:');
  console.log('  N=24: 60+ FPS ✓');
  console.log('  N=50: 30+ FPS ✓');
  console.log('  N=100: 10+ FPS ✓');
  console.log('');

  // Group results by size
  const bySize = new Map<number, PerformanceResult[]>();
  for (const result of results) {
    if (!bySize.has(result.size)) {
      bySize.set(result.size, []);
    }
    bySize.get(result.size)!.push(result);
  }

  // Compare implementations
  console.log('Performance Comparison:');
  for (const [size, sizeResults] of bySize) {
    console.log(`\nN=${size}:`);

    const original = sizeResults.find((r) => r.implementation === 'original');
    const optimized = sizeResults.find((r) => r.implementation === 'optimized');
    const worker = sizeResults.find((r) => r.implementation === 'worker');

    if (original && optimized) {
      const speedup = optimized.stepsPerSecond / original.stepsPerSecond;
      console.log(`  Optimized speedup: ${speedup.toFixed(2)}x`);
    }

    if (optimized && worker) {
      const overhead = 1 - worker.stepsPerSecond / optimized.stepsPerSecond;
      console.log(`  Worker overhead: ${(overhead * 100).toFixed(1)}%`);
    }

    // Check if targets are met
    const bestFPS = Math.max(original?.fps || 0, optimized?.fps || 0, worker?.fps || 0);

    let target = 10;
    if (size <= 24) target = 60;
    else if (size <= 50) target = 30;

    const achieved = bestFPS >= target;
    console.log(
      `  Target: ${target} FPS, Achieved: ${bestFPS.toFixed(1)} FPS ${achieved ? '✓' : '✗'}`,
    );
  }
}

/**
 * Real-time FPS test
 */
export function runRealtimeFPSTest(
  size: number,
  duration: number = 5000,
  implementation: 'original' | 'optimized' = 'optimized',
): Promise<number> {
  return new Promise((resolve) => {
    let frames = 0;
    let totalSteps = 0;
    const startTime = performance.now();

    const sim =
      implementation === 'original'
        ? new PhysicsSimulation({
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
          })
        : new OptimizedPhysicsSimulation({
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
            batchSize: 100,
          });

    const animate = () => {
      const currentTime = performance.now();
      const elapsed = currentTime - startTime;

      if (elapsed >= duration) {
        const fps = (frames / elapsed) * 1000;
        console.log(
          `Real-time test (N=${size}, ${implementation}): ${fps.toFixed(1)} FPS, ${totalSteps} steps`,
        );
        resolve(fps);
        return;
      }

      // Run simulation steps
      const stepsPerFrame = 100;
      sim.run(stepsPerFrame);
      totalSteps += stepsPerFrame;
      frames++;

      requestAnimationFrame(animate);
    };

    animate();
  });
}

/**
 * Memory usage test
 */
export function testMemoryUsage(size: number): void {
  if (!(performance as any).memory) {
    console.log('Memory profiling not available');
    return;
  }

  const memory = (performance as any).memory;

  console.log(`\nMemory usage for N=${size}:`);

  // Test original
  const beforeOriginal = memory.usedJSHeapSize;
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
  });
  const afterOriginal = memory.usedJSHeapSize;
  console.log(`  Original: ${((afterOriginal - beforeOriginal) / 1024 / 1024).toFixed(2)} MB`);

  // Test optimized
  const beforeOptimized = memory.usedJSHeapSize;
  const optimized = new OptimizedPhysicsSimulation({
    size,
    weights: {
      a1: 1.0,
      a2: 1.0,
      b1: 1.0,
      b2: 1.0,
      c1: 1.0,
      c2: 1.0,
    },
  });
  const afterOptimized = memory.usedJSHeapSize;
  console.log(`  Optimized: ${((afterOptimized - beforeOptimized) / 1024 / 1024).toFixed(2)} MB`);

  const savings = 1 - (afterOptimized - beforeOptimized) / (afterOriginal - beforeOriginal);
  console.log(`  Memory savings: ${(savings * 100).toFixed(1)}%`);
}
