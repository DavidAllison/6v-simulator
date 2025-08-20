import { useState, useEffect, useRef } from 'react';
import {
  runPerformanceTests,
  runRealtimeFPSTest,
  testMemoryUsage,
} from '../lib/six-vertex/performanceTest';
import { OptimizedPhysicsSimulation } from '../lib/six-vertex/optimizedSimulation';
import { PhysicsSimulation } from '../lib/six-vertex/physicsSimulation';
import { createWorkerSimulation } from '../lib/six-vertex/worker/workerInterface';
import { createRenderer } from '../lib/six-vertex/renderer/pathRenderer';
import { RenderMode } from '../lib/six-vertex/types';
import './performanceDemo.css';

/**
 * Performance demonstration and testing page
 */
export function PerformanceDemo() {
  const [isRunning, setIsRunning] = useState(false);
  const [testResults, setTestResults] = useState<string>('');
  const [currentFPS, setCurrentFPS] = useState(0);
  const [selectedSize, setSelectedSize] = useState(24);
  const [selectedImpl, setSelectedImpl] = useState<'original' | 'optimized' | 'worker'>(
    'optimized',
  );
  const [simulationStats, setSimulationStats] = useState<any>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<any>(null);
  const simRef = useRef<any>(null);
  const animationRef = useRef<number | null>(null);
  const fpsCounterRef = useRef({ frames: 0, lastTime: 0 });

  // Initialize renderer
  useEffect(() => {
    if (canvasRef.current && !rendererRef.current) {
      rendererRef.current = createRenderer(canvasRef.current, {
        mode: RenderMode.Vertices,
        showGrid: true,
        cellSize: Math.min(40, 800 / selectedSize),
        lineWidth: 1,
      });
    }
  }, [selectedSize]);

  // Update renderer when size changes
  useEffect(() => {
    if (rendererRef.current) {
      rendererRef.current.updateConfig({
        cellSize: Math.min(40, 800 / selectedSize),
      });
    }
  }, [selectedSize]);

  // Start/stop simulation
  const toggleSimulation = async () => {
    if (isRunning) {
      stopSimulation();
    } else {
      await startSimulation();
    }
  };

  const startSimulation = async () => {
    setIsRunning(true);
    fpsCounterRef.current = { frames: 0, lastTime: performance.now() };

    // Create simulation based on selected implementation
    if (selectedImpl === 'original' && selectedSize <= 32) {
      simRef.current = new PhysicsSimulation({
        size: selectedSize,
        weights: {
          a1: 1.0,
          a2: 1.0,
          b1: 1.0,
          b2: 1.0,
          c1: 1.0,
          c2: 1.0,
        },
        seed: Date.now(),
        initialState: 'dwbc-high',
      });
    } else if (selectedImpl === 'worker') {
      simRef.current = await createWorkerSimulation(
        {
          size: selectedSize,
          weights: {
            a1: 1.0,
            a2: 1.0,
            b1: 1.0,
            b2: 1.0,
            c1: 1.0,
            c2: 1.0,
          },
          seed: Date.now(),
          batchSize: selectedSize <= 24 ? 200 : selectedSize <= 50 ? 100 : 50,
        },
        {
          onStats: (stats) => {
            setSimulationStats(stats);
            if (rendererRef.current && simRef.current) {
              simRef.current.getState();
            }
          },
          onState: (state) => {
            if (rendererRef.current) {
              rendererRef.current.render(state);
            }
          },
        },
      );

      if (simRef.current) {
        simRef.current.startContinuous(60);
      }
    } else {
      simRef.current = new OptimizedPhysicsSimulation({
        size: selectedSize,
        weights: {
          a1: 1.0,
          a2: 1.0,
          b1: 1.0,
          b2: 1.0,
          c1: 1.0,
          c2: 1.0,
        },
        seed: Date.now(),
        batchSize: selectedSize <= 24 ? 200 : selectedSize <= 50 ? 100 : 50,
      });
    }

    // Start animation loop for non-worker implementations
    if (selectedImpl !== 'worker') {
      animate();
    }
  };

  const stopSimulation = () => {
    setIsRunning(false);

    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }

    if (simRef.current) {
      if (selectedImpl === 'worker' && simRef.current.stop) {
        simRef.current.stop();
        simRef.current.terminate();
      }
      simRef.current = null;
    }
  };

  const animate = () => {
    if (!simRef.current || !isRunning) return;

    const currentTime = performance.now();
    const deltaTime = currentTime - fpsCounterRef.current.lastTime;

    // Run simulation steps
    const stepsPerFrame = selectedSize <= 24 ? 200 : selectedSize <= 50 ? 100 : 50;
    simRef.current.run(stepsPerFrame);

    // Update visualization
    const state = simRef.current.getState();
    if (rendererRef.current && state) {
      rendererRef.current.render(state);
    }

    // Update stats
    const stats = simRef.current.getStats();
    setSimulationStats(stats);

    // Calculate FPS
    fpsCounterRef.current.frames++;
    if (deltaTime >= 1000) {
      const fps = (fpsCounterRef.current.frames / deltaTime) * 1000;
      setCurrentFPS(fps);
      fpsCounterRef.current = { frames: 0, lastTime: currentTime };
    }

    animationRef.current = requestAnimationFrame(animate);
  };

  const runTests = async () => {
    setTestResults('Running performance tests...\n');

    // Run comprehensive tests
    try {
      await runPerformanceTests();

      // Memory usage test
      if ((performance as any).memory) {
        setTestResults((prev) => prev + '\n=== Memory Usage Test ===\n');
        testMemoryUsage(24);
        testMemoryUsage(50);
      }

      setTestResults((prev) => prev + '\nTests completed! Check console for detailed results.');
    } catch (error) {
      setTestResults((prev) => prev + `\nError: ${error}`);
    }
  };

  const runFPSTest = async () => {
    setTestResults('Running real-time FPS test...\n');

    for (const size of [24, 50, 100]) {
      const fps = await runRealtimeFPSTest(size, 3000, 'optimized');
      setTestResults((prev) => prev + `N=${size}: ${fps.toFixed(1)} FPS\n`);
    }
  };

  return (
    <div className="performance-page">
      <h1 className="performance-page__title">6-Vertex Model Performance Demo</h1>

      <div className="performance-page__grid">
        {/* Visualization */}
        <div className="performance-visualization">
          <h2 className="performance-visualization__title">Live Simulation</h2>

          <div className="performance-controls">
            <div className="performance-controls__row">
              <div className="performance-controls__group">
                <span className="performance-controls__label">Size:</span>
                <select
                  value={selectedSize}
                  onChange={(e) => setSelectedSize(Number(e.target.value))}
                  disabled={isRunning}
                  className="performance-controls__select"
                >
                  <option value={8}>8x8</option>
                  <option value={16}>16x16</option>
                  <option value={24}>24x24</option>
                  <option value={32}>32x32</option>
                  <option value={50}>50x50</option>
                  <option value={100}>100x100</option>
                </select>
              </div>

              <div className="performance-controls__group">
                <span className="performance-controls__label">Implementation:</span>
                <select
                  value={selectedImpl}
                  onChange={(e) => setSelectedImpl(e.target.value as any)}
                  disabled={isRunning}
                  className="performance-controls__select"
                >
                  {selectedSize <= 32 && <option value="original">Original</option>}
                  <option value="optimized">Optimized</option>
                  <option value="worker">Web Worker</option>
                </select>
              </div>
            </div>

            <div className="performance-controls__row">
              <button
                onClick={toggleSimulation}
                className={`performance-controls__button ${isRunning ? 'performance-controls__button--stop' : 'performance-controls__button--primary'}`}
              >
                {isRunning ? 'Stop' : 'Start'} Simulation
              </button>
            </div>
          </div>

          <div className="performance-stats">
            <div className="performance-stats__grid">
              <div className="performance-stats__item">
                <span className="performance-stats__label">FPS:</span>
                <span className="performance-stats__value">{currentFPS.toFixed(1)}</span>
              </div>
              <div className="performance-stats__item">
                <span className="performance-stats__label">Steps:</span>
                <span className="performance-stats__value">{simulationStats?.step || 0}</span>
              </div>
              <div className="performance-stats__item">
                <span className="performance-stats__label">Acceptance:</span>
                <span className="performance-stats__value">
                  {(simulationStats?.acceptanceRate * 100 || 0).toFixed(1)}%
                </span>
              </div>
              <div className="performance-stats__item">
                <span className="performance-stats__label">Flippable:</span>
                <span className="performance-stats__value">{simulationStats?.flippableCount || 'N/A'}</span>
              </div>
            </div>
          </div>

          <canvas
            ref={canvasRef}
            width={800}
            height={800}
            className="performance-canvas"
          />
        </div>

        {/* Performance Tests */}
        <div className="performance-tests">
          <h2 className="performance-tests__title">Performance Tests</h2>

          <div className="performance-tests__buttons">
            <button
              onClick={runTests}
              className="performance-tests__button performance-tests__button--comprehensive"
            >
              Run Comprehensive Tests
            </button>

            <button
              onClick={runFPSTest}
              className="performance-tests__button performance-tests__button--fps"
            >
              Run FPS Test
            </button>
          </div>

          <div className="performance-console">
            <pre>{testResults || 'Click "Run Tests" to start performance benchmarks'}</pre>
          </div>

          <div className="performance-info">
            <h3 className="performance-info__title">Performance Targets</h3>
            <ul className="performance-info__list">
              <li className="performance-info__item">
                <span>N=24:</span>
                <span className={`performance-info__target ${currentFPS >= 60 && selectedSize === 24 ? 'active' : ''}`}>
                  60+ FPS (Target)
                </span>
              </li>
              <li className="performance-info__item">
                <span>N=50:</span>
                <span className={`performance-info__target ${currentFPS >= 30 && selectedSize === 50 ? 'active' : ''}`}>
                  30+ FPS (Target)
                </span>
              </li>
              <li className="performance-info__item">
                <span>N=100:</span>
                <span className={`performance-info__target ${currentFPS >= 10 && selectedSize === 100 ? 'active' : ''}`}>
                  10+ FPS (Target)
                </span>
              </li>
            </ul>
          </div>

          <div className="performance-optimizations">
            <h3 className="performance-optimizations__title">Optimizations Implemented</h3>
            <ul className="performance-optimizations__list">
              <li className="performance-optimizations__item">Incremental flippable list management</li>
              <li className="performance-optimizations__item">Typed arrays for memory efficiency</li>
              <li className="performance-optimizations__item">Batch processing (adaptive)</li>
              <li className="performance-optimizations__item">Optimized XorShift RNG</li>
              <li className="performance-optimizations__item">In-place state updates</li>
              <li className="performance-optimizations__item">Web Worker for large lattices</li>
              <li className="performance-optimizations__item">Cached weight calculations</li>
              <li className="performance-optimizations__item">O(1) flippable position lookups</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
