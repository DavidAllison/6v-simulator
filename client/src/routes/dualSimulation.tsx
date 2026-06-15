import React, { useState, useEffect, useCallback, useRef } from 'react';
import { DualSimulationManager } from '../lib/six-vertex/dualSimulation';
import { DualSimulationDisplay } from '../components/DualSimulationDisplay';
import type { DualSimulationConfig, ConvergenceMetrics } from '../lib/six-vertex/dualSimulation';
import type { LatticeState } from '../lib/six-vertex/types';
import { PageShell } from '../components/PageShell';
import '../App.css';
import styles from './dualSimulation.module.css';

export function DualSimulation() {
  const [size, setSize] = useState(16);
  const [temperature, setTemperature] = useState(0.5);
  const [weights, setWeights] = useState({
    a1: 1,
    a2: 1,
    b1: 1,
    b2: 1,
    c1: 1,
    c2: 1,
  });
  const [isRunning, setIsRunning] = useState(false);
  const [showArrows, setShowArrows] = useState(false);
  const [stepsPerFrame, setStepsPerFrame] = useState(100);

  const [latticeA, setLatticeA] = useState<LatticeState | null>(null);
  const [latticeB, setLatticeB] = useState<LatticeState | null>(null);
  const [metrics, setMetrics] = useState<ConvergenceMetrics | null>(null);

  const managerRef = useRef<DualSimulationManager | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Initialize dual simulation
  const initializeSimulation = useCallback(() => {
    const config: DualSimulationConfig = {
      size,
      temperature,
      weights,
      seedA: Math.floor(Math.random() * 1000000),
      seedB: Math.floor(Math.random() * 1000000),
      configA: { type: 'high' },
      configB: { type: 'low' },
    };

    managerRef.current = new DualSimulationManager(config);

    // Get initial states
    setLatticeA(managerRef.current.getLatticeA());
    setLatticeB(managerRef.current.getLatticeB());
    setMetrics(managerRef.current.getConvergenceMetrics());
  }, [size, temperature, weights]);

  // Animation loop
  const animate = useCallback(() => {
    if (!managerRef.current || !isRunning) return;

    // Step the simulation
    managerRef.current.step(stepsPerFrame);

    // Update states
    setLatticeA(managerRef.current.getLatticeA());
    setLatticeB(managerRef.current.getLatticeB());

    // Check for auto-stop on convergence
    const currentMetrics = managerRef.current.getConvergenceMetrics();
    setMetrics(currentMetrics);
    if (currentMetrics.isConverged) {
      setIsRunning(false);
      return;
    }

    // Continue animation
    animationFrameRef.current = requestAnimationFrame(animate);
  }, [isRunning, stepsPerFrame]);

  // Start/stop animation
  useEffect(() => {
    if (isRunning) {
      animationFrameRef.current = requestAnimationFrame(animate);
    } else if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isRunning, animate]);

  // Initialize on mount
  useEffect(() => {
    initializeSimulation();
  }, [initializeSimulation]);

  // Update weights in real-time
  const handleWeightChange = (type: keyof typeof weights, value: number) => {
    const newWeights = { ...weights, [type]: value };
    setWeights(newWeights);

    if (managerRef.current) {
      managerRef.current.updateWeights(newWeights);
    }
  };

  // Update temperature in real-time
  const handleTemperatureChange = (value: number) => {
    setTemperature(value);

    if (managerRef.current) {
      managerRef.current.updateTemperature(value);
    }
  };

  // Reset simulations
  const handleReset = () => {
    setIsRunning(false);
    initializeSimulation();
  };

  // Swap configurations
  const handleSwapConfigs = () => {
    if (!managerRef.current) return;

    setIsRunning(false);
    managerRef.current.reset(
      { type: 'low' }, // A gets Low
      { type: 'high' }, // B gets High
    );

    // Update states
    setLatticeA(managerRef.current.getLatticeA());
    setLatticeB(managerRef.current.getLatticeB());
  };

  const cellSize = Math.min(20, 400 / size);

  return (
    <PageShell
      title="Compare DWBC High vs Low"
      subtitle="Two simulations side by side with convergence tracking"
    >
      <div className={`dual-simulation-page ${styles.page}`}>
        <div className={`control-panel ${styles.panel}`}>
          <div className={`controls-grid ${styles.controlsGrid}`}>
            {/* Size control */}
            <div className="control-group">
              <label>
                Lattice Size: {size}×{size}
                <input
                  type="range"
                  min="8"
                  max="32"
                  value={size}
                  onChange={(e) => setSize(Number(e.target.value))}
                  disabled={isRunning}
                />
              </label>
            </div>

            {/* Temperature control */}
            <div className="control-group">
              <label>
                Temperature: {temperature.toFixed(2)}
                <input
                  type="range"
                  min="0.1"
                  max="2"
                  step="0.1"
                  value={temperature}
                  onChange={(e) => handleTemperatureChange(Number(e.target.value))}
                />
              </label>
            </div>

            {/* Steps per frame */}
            <div className="control-group">
              <label>
                Speed: {stepsPerFrame} steps/frame
                <input
                  type="range"
                  min="10"
                  max="1000"
                  step="10"
                  value={stepsPerFrame}
                  onChange={(e) => setStepsPerFrame(Number(e.target.value))}
                />
              </label>
            </div>

            {/* Show arrows toggle */}
            <div className="control-group">
              <label>
                <input
                  type="checkbox"
                  checked={showArrows}
                  onChange={(e) => setShowArrows(e.target.checked)}
                />
                Show Arrows
              </label>
            </div>
          </div>

          {/* Weight controls */}
          <div className={`weights-section ${styles.weightsSection}`}>
            <h3>Vertex Weights</h3>
            <div className={`weights-grid ${styles.weightsGrid}`}>
              {Object.entries(weights).map(([type, value]) => (
                <label key={type}>
                  {type.toUpperCase()}: {value.toFixed(1)}
                  <input
                    type="range"
                    min="0.1"
                    max="2"
                    step="0.1"
                    value={value}
                    onChange={(e) =>
                      handleWeightChange(type as keyof typeof weights, Number(e.target.value))
                    }
                  />
                </label>
              ))}
            </div>
          </div>

          {/* Action buttons */}
          <div className={`action-buttons ${styles.actionButtons}`}>
            <button
              type="button"
              onClick={() => setIsRunning(!isRunning)}
              className={`btn ${isRunning ? 'btn--danger' : 'btn--success'}`}
            >
              {isRunning ? 'Stop' : 'Start'}
            </button>

            <button type="button" onClick={handleReset} className="btn btn--primary">
              Reset
            </button>

            <button
              type="button"
              onClick={handleSwapConfigs}
              disabled={isRunning}
              className="btn btn--secondary"
            >
              Swap Configs
            </button>
          </div>
        </div>

        {/* Dual simulation display */}
        <DualSimulationDisplay
          latticeA={latticeA}
          latticeB={latticeB}
          showArrows={showArrows}
          cellSize={cellSize}
        />

        {/* Live convergence metrics */}
        {metrics && (
          <div className={`convergence-panel ${styles.convergencePanel}`}>
            <div>
              <div className={styles.metricLabel}>Convergence</div>
              <div className={styles.metricValue}>{(metrics.volumeRatio * 100).toFixed(1)}%</div>
            </div>
            <div>
              <div className={styles.metricLabel}>Volume difference</div>
              <div className={styles.metricValue}>{metrics.volumeDifference.toFixed(1)}</div>
            </div>
            <div>
              <div className={styles.metricLabel}>Avg height diff</div>
              <div className={styles.metricValue}>{metrics.averageHeightDifference.toFixed(3)}</div>
            </div>
            <div>
              <div className={styles.metricLabel}>Smoothed diff</div>
              <div className={styles.metricValue}>{metrics.smoothedDifference.toFixed(2)}</div>
            </div>
            <div>
              <div className={styles.metricLabel}>Status</div>
              <div
                className={`${styles.statusValue} ${metrics.isConverged ? styles.statusConverged : ''}`}
              >
                {metrics.isConverged ? 'Converged ✓' : isRunning ? 'Running…' : 'Not converged'}
              </div>
            </div>
          </div>
        )}

        {/* Information panel */}
        <div className={`info-panel ${styles.panel}`}>
          <h3>About Dual Simulation Convergence</h3>
          <p>
            This demonstration runs two 6-vertex model simulations simultaneously with different
            initial conditions (DWBC High and Low). The convergence tracking monitors when the
            height functions of both simulations reach similar values, indicating that the systems
            have equilibrated to comparable macroscopic states despite different starting
            configurations.
          </p>
          <ul>
            <li>
              <strong>Volume</strong>: The total sum of all vertex heights in the lattice
            </li>
            <li>
              <strong>Average Height</strong>: The mean height across all vertices
            </li>
            <li>
              <strong>Convergence</strong>: Achieved when volume ratio exceeds 95% and remains
              stable
            </li>
            <li>
              <strong>Smoothed Difference</strong>: Moving average of volume differences to reduce
              noise
            </li>
          </ul>
        </div>
      </div>
    </PageShell>
  );
}
