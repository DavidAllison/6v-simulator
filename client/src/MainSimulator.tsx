import { useState, useRef, useEffect, useCallback } from 'react';
import type {
  SimulationController,
  LatticeState,
  SimulationParams,
  SimulationStats,
  RenderConfig,
} from './lib/six-vertex/types';
import { RenderMode, BoundaryCondition } from './lib/six-vertex/types';
import { createSimulation } from './lib/six-vertex/simulation';
import type { SimulationConfig } from './lib/six-vertex/simulation';
import { PathRenderer } from './lib/six-vertex/renderer/pathRenderer';
import ControlPanel from './components/ControlPanel';
import StatisticsPanel from './components/StatisticsPanel';
import VisualizationCanvas from './components/VisualizationCanvas';
import { SaveLoadPanel } from './components/SaveLoadPanel';
import { CollapsiblePanel } from './components/CollapsiblePanel';
import type { SimulationData } from './lib/storage';
import { useTheme } from './hooks/useTheme';
import { getThemeColors } from './lib/six-vertex/themeColors';
import { DualSimulationManager } from './lib/six-vertex/dualSimulation';
import type {
  ConvergenceMetrics,
  SimulationStats as DualStats,
} from './lib/six-vertex/dualSimulation';
import { DualSimulationDisplay } from './components/DualSimulationDisplay';

function MainSimulator() {
  // Get theme context
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';

  // Refs
  const rendererRef = useRef<PathRenderer | null>(null);
  const simulationRef = useRef<SimulationController | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Simulation state
  const [isRunning, setIsRunning] = useState(false);
  const [stats, setStats] = useState<SimulationStats | null>(null);
  const [latticeState, setLatticeState] = useState<LatticeState | null>(null);
  const [latticeSize, setLatticeSize] = useState(10);
  const [fps, setFps] = useState(0);
  const [stepsPerFrame, setStepsPerFrame] = useState(10);

  // Simulation parameters
  const [temperature, setTemperature] = useState(1.0);
  const [boundaryCondition, setBoundaryCondition] = useState<BoundaryCondition>(
    BoundaryCondition.DWBC,
  );
  const [dwbcType, setDwbcType] = useState<'high' | 'low'>('high');
  const [renderMode, setRenderMode] = useState<RenderMode>(RenderMode.Paths);
  const [showGrid, setShowGrid] = useState(true);
  const [animateFlips, setAnimateFlips] = useState(false);
  const [seed, setSeed] = useState(12345);

  // Dual simulation mode state
  const [simulationMode, setSimulationMode] = useState<'single' | 'dual'>('dual');
  const [dualManager, setDualManager] = useState<DualSimulationManager | null>(null);
  const [dualLatticeA, setDualLatticeA] = useState<LatticeState | null>(null);
  const [dualLatticeB, setDualLatticeB] = useState<LatticeState | null>(null);
  const [dualStatsA, setDualStatsA] = useState<DualStats | null>(null);
  const [dualStatsB, setDualStatsB] = useState<DualStats | null>(null);
  const [convergenceMetrics, setConvergenceMetrics] = useState<ConvergenceMetrics | null>(null);
  const [configA, setConfigA] = useState<'high' | 'low'>('high');
  const [configB, setConfigB] = useState<'high' | 'low'>('low');
  const dualAnimationFrameRef = useRef<number | null>(null);

  // Vertex weights
  const [weights, setWeights] = useState({
    a1: 1.0,
    a2: 1.0,
    b1: 1.0,
    b2: 1.0,
    c1: 1.0,
    c2: 1.0,
  });

  // FPS counter
  useEffect(() => {
    let frameCount = 0;
    let lastTime = performance.now();

    const updateFps = () => {
      const currentTime = performance.now();
      frameCount++;

      if (currentTime >= lastTime + 1000) {
        setFps(Math.round((frameCount * 1000) / (currentTime - lastTime)));
        frameCount = 0;
        lastTime = currentTime;
      }

      if (isRunning) {
        requestAnimationFrame(updateFps);
      }
    };

    if (isRunning) {
      updateFps();
    }
  }, [isRunning]);

  // Initialize simulation
  const initializeSimulation = useCallback(() => {
    try {
      if (simulationMode === 'single') {
        // Single simulation mode (existing code)
        const params: SimulationParams = {
          temperature,
          beta: 1.0 / temperature,
          weights,
          boundaryCondition,
          dwbcConfig: boundaryCondition === BoundaryCondition.DWBC ? { type: dwbcType } : undefined,
          seed,
        };

        // Use optimized simulation for better performance
        const simConfig: SimulationConfig = {
          useOptimized: true,
          useWorker: false, // Disable worker for now to avoid issues
          workerThreshold: 50,
        };

        const simulation = createSimulation(params, simConfig);
        simulationRef.current = simulation;

        // Initialize lattice
        simulation.initialize(latticeSize, latticeSize, params);

        if (simulation) {
          const state = simulation.getState();
          setLatticeState(state);
          setStats(simulation.getStats());

          if (rendererRef.current) {
            rendererRef.current.render(state);
          }
        }

        // Set up event handlers
        simulation.on('onStateChange', (state: LatticeState) => {
          setLatticeState(state);
          if (rendererRef.current) {
            rendererRef.current.render(state);
          }
        });

        simulation.on('onStep', (newStats: SimulationStats) => {
          setStats(newStats);
        });
      } else {
        // Dual simulation mode
        const dualConfig = {
          size: latticeSize,
          temperature,
          weights,
          seedA: seed,
          seedB: seed + 1000, // Different seed for simulation B
          configA: { type: configA },
          configB: { type: configB },
        };

        const manager = new DualSimulationManager(dualConfig);
        setDualManager(manager);

        // Get initial states
        setDualLatticeA(manager.getLatticeA());
        setDualLatticeB(manager.getLatticeB());
        setDualStatsA(manager.getStatsA());
        setDualStatsB(manager.getStatsB());
        setConvergenceMetrics(manager.getConvergenceMetrics());
      }
    } catch (error) {
      console.error('Failed to initialize simulation:', error);
      // Show error in UI instead of crashing
      alert(`Failed to initialize simulation: ${error}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    latticeSize,
    temperature,
    boundaryCondition,
    dwbcType,
    seed,
    simulationMode,
    configA,
    configB,
  ]);

  // Re-initialize when key parameters change
  useEffect(() => {
    initializeSimulation();

    return () => {
      if (simulationRef.current?.isRunning()) {
        simulationRef.current.pause();
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [latticeSize, boundaryCondition, dwbcType, seed, initializeSimulation]); // Re-initialize on these changes

  // Handle renderer ready
  const handleRendererReady = useCallback(
    (renderer: PathRenderer) => {
      rendererRef.current = renderer;
      if (latticeState) {
        renderer.render(latticeState);
      }
    },
    [latticeState],
  );

  // Update weight
  const handleWeightChange = useCallback(
    (type: string, value: number) => {
      setWeights((prev) => ({ ...prev, [type]: value }));

      if (simulationRef.current) {
        const params: SimulationParams = {
          temperature,
          beta: 1.0 / temperature,
          weights: { ...weights, [type]: value },
          boundaryCondition,
          dwbcConfig: boundaryCondition === BoundaryCondition.DWBC ? { type: dwbcType } : undefined,
          seed,
        };
        simulationRef.current.updateParams(params);
      }
    },
    [temperature, weights, boundaryCondition, dwbcType, seed],
  );

  // Control functions
  const handleStep = useCallback(() => {
    try {
      if (simulationRef.current) {
        simulationRef.current.step();
      } else {
        console.error('Simulation not initialized');
        // Don't call initializeSimulation here to avoid circular dependency
      }
    } catch (error) {
      console.error('Error during step:', error);
      alert(`Error during step: ${error}`);
    }
  }, []);

  const runSimulation = useCallback(() => {
    if (!isRunning) return;

    if (simulationMode === 'single') {
      if (!simulationRef.current) return;

      try {
        // Run multiple steps per frame for performance
        for (let i = 0; i < stepsPerFrame; i++) {
          if (simulationRef.current) {
            simulationRef.current.step();
          }
        }

        animationFrameRef.current = requestAnimationFrame(() => runSimulation());
      } catch (error) {
        console.error('Error during simulation run:', error);
        setIsRunning(false); // Stop simulation on error
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = null;
        }
        // Don't show alert in animation loop to avoid spam
        console.error('Simulation stopped due to error:', error);
      }
    } else {
      // Dual simulation mode
      if (!dualManager) return;

      try {
        // Step both simulations
        dualManager.step(stepsPerFrame);

        // Update states
        setDualLatticeA(dualManager.getLatticeA());
        setDualLatticeB(dualManager.getLatticeB());
        setDualStatsA(dualManager.getStatsA());
        setDualStatsB(dualManager.getStatsB());
        setConvergenceMetrics(dualManager.getConvergenceMetrics());

        // Check for auto-stop on convergence
        const metrics = dualManager.getConvergenceMetrics();
        if (metrics.isConverged) {
          setIsRunning(false);
          console.log('Simulations have converged!');
          return;
        }

        dualAnimationFrameRef.current = requestAnimationFrame(() => runSimulation());
      } catch (error) {
        console.error('Error during dual simulation run:', error);
        setIsRunning(false);
        if (dualAnimationFrameRef.current) {
          cancelAnimationFrame(dualAnimationFrameRef.current);
          dualAnimationFrameRef.current = null;
        }
      }
    }
  }, [isRunning, stepsPerFrame, simulationMode, dualManager]);

  const handlePause = useCallback(() => {
    setIsRunning(false);
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (dualAnimationFrameRef.current) {
      cancelAnimationFrame(dualAnimationFrameRef.current);
      dualAnimationFrameRef.current = null;
    }
    if (simulationRef.current) {
      simulationRef.current.pause();
    }
  }, []);

  const handleReset = useCallback(() => {
    handlePause();
    // Re-initialize by changing seed to force re-render
    setSeed((prev) => prev + 1);
    // Reset dual manager if in dual mode
    if (simulationMode === 'dual' && dualManager) {
      dualManager.reset();
      setDualLatticeA(dualManager.getLatticeA());
      setDualLatticeB(dualManager.getLatticeB());
      setDualStatsA(dualManager.getStatsA());
      setDualStatsB(dualManager.getStatsB());
      setConvergenceMetrics(dualManager.getConvergenceMetrics());
    }
  }, [handlePause, simulationMode, dualManager]);

  const handleExportImage = useCallback(() => {
    if (rendererRef.current) {
      const dataUrl = rendererRef.current.exportImage('png');
      const link = document.createElement('a');
      link.download = `6vertex-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    }
  }, []);

  // Methods for save/load functionality
  const getCurrentSimulationData = useCallback((): SimulationData | null => {
    if (!simulationRef.current) {
      console.error('No simulation to save');
      return null;
    }

    try {
      const data = simulationRef.current.exportData();
      return {
        latticeState: data.state,
        params: data.params,
        stats: data.stats,
      };
    } catch (error) {
      console.error('Failed to export simulation data:', error);
      return null;
    }
  }, []);

  const loadSimulationData = useCallback(
    (data: SimulationData) => {
      try {
        // Pause if running
        if (isRunning) {
          handlePause();
        }

        // Import the data into the simulation
        if (simulationRef.current) {
          simulationRef.current.importData({
            state: data.latticeState,
            params: data.params,
            stats: data.stats,
          });

          // Update local state to match loaded data
          setLatticeState(data.latticeState);
          setStats(data.stats);
          setLatticeSize(data.latticeState.width);
          setTemperature(data.params.temperature);
          setWeights(data.params.weights);
          setBoundaryCondition(data.params.boundaryCondition);
          if (data.params.dwbcConfig) {
            setDwbcType(data.params.dwbcConfig.type);
          }
          if (data.params.seed !== undefined) {
            setSeed(data.params.seed);
          }

          // Re-render the loaded state
          if (rendererRef.current && data.latticeState) {
            rendererRef.current.render(data.latticeState);
          }
        } else {
          // If no simulation exists, create one with the loaded params
          const params: SimulationParams = data.params;
          const simConfig: SimulationConfig = {
            useOptimized: true,
            useWorker: false,
            workerThreshold: 50,
          };

          const simulation = createSimulation(params, simConfig);
          simulationRef.current = simulation;

          // Import the data
          simulation.importData({
            state: data.latticeState,
            params: data.params,
            stats: data.stats,
          });

          // Update local state
          setLatticeState(data.latticeState);
          setStats(data.stats);
          setLatticeSize(data.latticeState.width);
          setTemperature(data.params.temperature);
          setWeights(data.params.weights);
          setBoundaryCondition(data.params.boundaryCondition);
          if (data.params.dwbcConfig) {
            setDwbcType(data.params.dwbcConfig.type);
          }
          if (data.params.seed !== undefined) {
            setSeed(data.params.seed);
          }

          // Set up event handlers
          simulation.on('onStep', (newStats) => {
            setStats(newStats);
          });

          simulation.on('onStateChange', (newState) => {
            setLatticeState(newState);
            if (rendererRef.current) {
              rendererRef.current.render(newState);
            }
          });
        }

        console.log('Simulation loaded successfully');
      } catch (error) {
        console.error('Failed to load simulation data:', error);
        alert('Failed to load simulation. Please check the console for details.');
      }
    },
    [isRunning, handlePause],
  );

  // Effect to handle run state
  useEffect(() => {
    if (isRunning) {
      runSimulation();
    }
  }, [isRunning, runSimulation]);

  // Render config with theme-aware colors
  const renderConfig: Partial<RenderConfig> = {
    mode: renderMode,
    showGrid,
    animateFlips,
    cellSize: 30,
    lineWidth: 2,
    colors: getThemeColors(isDarkMode),
  };

  return (
    <div className="main-content">
      <CollapsiblePanel title="Controls" side="left" className="panel-section">
        <ControlPanel
          isRunning={isRunning}
          simulationMode={simulationMode}
          onSimulationModeChange={setSimulationMode}
          configA={configA}
          configB={configB}
          onConfigAChange={setConfigA}
          onConfigBChange={setConfigB}
          latticeSize={latticeSize}
          temperature={temperature}
          seed={seed}
          boundaryCondition={boundaryCondition}
          dwbcType={dwbcType}
          weights={weights}
          renderMode={renderMode}
          showGrid={showGrid}
          animateFlips={animateFlips}
          stepsPerFrame={stepsPerFrame}
          onLatticeSizeChange={setLatticeSize}
          onTemperatureChange={setTemperature}
          onSeedChange={setSeed}
          onBoundaryConditionChange={setBoundaryCondition}
          onDwbcTypeChange={setDwbcType}
          onWeightChange={handleWeightChange}
          onRenderModeChange={setRenderMode}
          onShowGridChange={setShowGrid}
          onAnimateFlipsChange={setAnimateFlips}
          onStepsPerFrameChange={setStepsPerFrame}
          onStep={handleStep}
          onRun={() => {
            if (simulationMode === 'single' && !simulationRef.current) {
              console.error('Simulation not initialized');
              initializeSimulation();
              // Wait a bit for initialization then try to run
              setTimeout(() => {
                if (simulationRef.current) {
                  setIsRunning(true);
                } else {
                  alert('Failed to initialize simulation. Please try resetting.');
                }
              }, 100);
            } else if (simulationMode === 'dual' && !dualManager) {
              console.error('Dual simulation not initialized');
              initializeSimulation();
              setTimeout(() => {
                if (dualManager) {
                  setIsRunning(true);
                } else {
                  alert('Failed to initialize dual simulation. Please try resetting.');
                }
              }, 100);
            } else {
              setIsRunning(true);
            }
          }}
          onPause={handlePause}
          onReset={handleReset}
          onExportImage={handleExportImage}
        />
      </CollapsiblePanel>

      {simulationMode === 'single' ? (
        <VisualizationCanvas
          renderer={rendererRef.current}
          latticeState={latticeState}
          onRendererReady={handleRendererReady}
          renderConfig={renderConfig}
        />
      ) : (
        <div
          className="dual-simulation-container"
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            padding: '20px',
            overflow: 'auto',
          }}
        >
          <DualSimulationDisplay
            latticeA={dualLatticeA}
            latticeB={dualLatticeB}
            statsA={dualStatsA}
            statsB={dualStatsB}
            convergenceMetrics={convergenceMetrics}
            showArrows={renderMode === RenderMode.Arrows}
            cellSize={Math.min(30, 600 / latticeSize)}
          />
        </div>
      )}

      <CollapsiblePanel title="Info" side="right" className="panel-section">
        {simulationMode === 'single' ? (
          <>
            <StatisticsPanel stats={stats} fps={fps} />
            <SaveLoadPanel
              getCurrentData={getCurrentSimulationData}
              onLoadData={loadSimulationData}
            />
          </>
        ) : (
          <>
            {/* Dual mode statistics */}
            <div className="dual-stats-section">
              <h3>Convergence Status</h3>
              {convergenceMetrics && (
                <div className="convergence-info">
                  <p>Volume Ratio: {(convergenceMetrics.volumeRatio * 100).toFixed(1)}%</p>
                  <p>Status: {convergenceMetrics.isConverged ? 'Converged' : 'Running'}</p>
                  <p>Smoothed Diff: {(convergenceMetrics.smoothedDifference * 100).toFixed(2)}%</p>
                </div>
              )}
            </div>
            {dualStatsA && dualStatsB && (
              <div className="dual-stats-comparison">
                <h4>Simulation A</h4>
                <StatisticsPanel
                  stats={
                    {
                      step: dualStatsA.totalSteps,
                      energy: 0,
                      vertexCounts: {} as Record<string, number>,
                      acceptanceRate:
                        dualStatsA.flipSuccesses / Math.max(1, dualStatsA.flipAttempts),
                      flipAttempts: dualStatsA.flipAttempts,
                      successfulFlips: dualStatsA.flipSuccesses,
                      beta: 1 / temperature,
                      height: dualStatsA.heightData?.totalVolume || 0,
                    } as SimulationStats
                  }
                  fps={fps}
                />

                <h4>Simulation B</h4>
                <StatisticsPanel
                  stats={
                    {
                      step: dualStatsB.totalSteps,
                      energy: 0,
                      vertexCounts: {} as Record<string, number>,
                      acceptanceRate:
                        dualStatsB.flipSuccesses / Math.max(1, dualStatsB.flipAttempts),
                      flipAttempts: dualStatsB.flipAttempts,
                      successfulFlips: dualStatsB.flipSuccesses,
                      beta: 1 / temperature,
                      height: dualStatsB.heightData?.totalVolume || 0,
                    } as SimulationStats
                  }
                  fps={fps}
                />
              </div>
            )}
          </>
        )}
      </CollapsiblePanel>
    </div>
  );
}

export default MainSimulator;
