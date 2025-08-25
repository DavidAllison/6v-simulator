import React, { useState, useEffect, useCallback, useRef } from 'react';
import { DualSimulationManager } from '../lib/six-vertex/dualSimulation';
import { DualSimulationDisplay } from '../components/DualSimulationDisplay';
import type {
  DualSimulationConfig,
  SimulationStats,
  ConvergenceMetrics,
} from '../lib/six-vertex/dualSimulation';
import type { LatticeState } from '../lib/six-vertex/types';
import '../App.css';

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
  const [statsA, setStatsA] = useState<SimulationStats | null>(null);
  const [statsB, setStatsB] = useState<SimulationStats | null>(null);
  const [convergenceMetrics, setConvergenceMetrics] = useState<ConvergenceMetrics | null>(null);

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
    setStatsA(managerRef.current.getStatsA());
    setStatsB(managerRef.current.getStatsB());
    setConvergenceMetrics(managerRef.current.getConvergenceMetrics());
  }, [size, temperature, weights]);

  // Animation loop
  const animate = useCallback(() => {
    if (!managerRef.current || !isRunning) return;

    // Step the simulation
    managerRef.current.step(stepsPerFrame);

    // Update states
    setLatticeA(managerRef.current.getLatticeA());
    setLatticeB(managerRef.current.getLatticeB());
    setStatsA(managerRef.current.getStatsA());
    setStatsB(managerRef.current.getStatsB());
    setConvergenceMetrics(managerRef.current.getConvergenceMetrics());

    // Check for auto-stop on convergence
    const metrics = managerRef.current.getConvergenceMetrics();
    if (metrics.isConverged) {
      setIsRunning(false);
      console.log('Simulations have converged!');
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
    setStatsA(managerRef.current.getStatsA());
    setStatsB(managerRef.current.getStatsB());
    setConvergenceMetrics(managerRef.current.getConvergenceMetrics());
  };

  const cellSize = Math.min(20, 400 / size);

  return (
    <div className="dual-simulation-page" style={{ padding: '20px' }}>
      <h1>Dual Simulation with Convergence Tracking</h1>

      <div
        className="control-panel"
        style={{
          background: 'var(--panel-bg)',
          padding: '20px',
          borderRadius: '8px',
          marginBottom: '20px',
        }}
      >
        <div
          className="controls-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '15px',
          }}
        >
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
        <div className="weights-section" style={{ marginTop: '20px' }}>
          <h3>Vertex Weights</h3>
          <div
            className="weights-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '10px',
            }}
          >
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
        <div
          className="action-buttons"
          style={{
            marginTop: '20px',
            display: 'flex',
            gap: '10px',
          }}
        >
          <button
            onClick={() => setIsRunning(!isRunning)}
            style={{
              padding: '10px 20px',
              background: isRunning ? 'var(--red-500)' : 'var(--green-500)',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
            }}
          >
            {isRunning ? 'Stop' : 'Start'}
          </button>

          <button
            onClick={handleReset}
            style={{
              padding: '10px 20px',
              background: 'var(--blue-500)',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
            }}
          >
            Reset
          </button>

          <button
            onClick={handleSwapConfigs}
            disabled={isRunning}
            style={{
              padding: '10px 20px',
              background: 'var(--purple-500)',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              opacity: isRunning ? 0.5 : 1,
            }}
          >
            Swap Configs
          </button>
        </div>
      </div>

      {/* Dual simulation display */}
      <DualSimulationDisplay
        latticeA={latticeA}
        latticeB={latticeB}
        statsA={statsA}
        statsB={statsB}
        convergenceMetrics={convergenceMetrics}
        showArrows={showArrows}
        cellSize={cellSize}
      />

      {/* Information panel */}
      <div
        className="info-panel"
        style={{
          marginTop: '20px',
          padding: '20px',
          background: 'var(--panel-bg)',
          borderRadius: '8px',
        }}
      >
        <h3>About Dual Simulation Convergence</h3>
        <p>
          This demonstration runs two 6-vertex model simulations simultaneously with different
          initial conditions (DWBC High and Low). The convergence tracking monitors when the height
          functions of both simulations reach similar values, indicating that the systems have
          equilibrated to comparable macroscopic states despite different starting configurations.
        </p>
        <ul>
          <li>
            <strong>Volume</strong>: The total sum of all vertex heights in the lattice
          </li>
          <li>
            <strong>Average Height</strong>: The mean height across all vertices
          </li>
          <li>
            <strong>Convergence</strong>: Achieved when volume ratio exceeds 95% and remains stable
          </li>
          <li>
            <strong>Smoothed Difference</strong>: Moving average of volume differences to reduce
            noise
          </li>
        </ul>
      </div>
    </div>
  );
}
