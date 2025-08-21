import { useState, useRef, useEffect, useCallback } from 'react';
import type {
  SimulationController,
  LatticeState,
  SimulationParams,
  SimulationStats,
  RenderConfig,
} from './lib/six-vertex/types';
import { RenderMode, VertexType, BoundaryCondition } from './lib/six-vertex/types';
import { createSimulation } from './lib/six-vertex/simulation';
import type { SimulationConfig } from './lib/six-vertex/simulation';
import { PathRenderer } from './lib/six-vertex/renderer/pathRenderer';
import ControlPanel from './components/ControlPanel';
import StatisticsPanel from './components/StatisticsPanel';
import VisualizationCanvas from './components/VisualizationCanvas';
import { SaveLoadPanel } from './components/SaveLoadPanel';
import { CollapsiblePanel } from './components/CollapsiblePanel';
import type { SimulationData } from './lib/storage';

function MainSimulator() {
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
    } catch (error) {
      console.error('Failed to initialize simulation:', error);
      // Show error in UI instead of crashing
      alert(`Failed to initialize simulation: ${error}`);
    }
  }, [latticeSize, temperature, weights, boundaryCondition, dwbcType, seed]);

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
  }, [latticeSize, boundaryCondition, dwbcType, seed]); // Re-initialize on these changes - removed initializeSimulation to avoid circular dep

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
    if (!simulationRef.current || !isRunning) return;

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
  }, [isRunning, stepsPerFrame]);

  const handlePause = useCallback(() => {
    setIsRunning(false);
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (simulationRef.current) {
      simulationRef.current.pause();
    }
  }, []);

  const handleReset = useCallback(() => {
    handlePause();
    // Re-initialize by changing seed to force re-render
    setSeed((prev) => prev + 1);
  }, [handlePause]);

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
      const data = (simulationRef.current as any).exportData();
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
          (simulationRef.current as any).importData({
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
          (simulation as any).importData({
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

  // Render config
  const renderConfig: Partial<RenderConfig> = {
    mode: renderMode,
    showGrid,
    animateFlips,
    cellSize: 30,
    lineWidth: 2,
    colors: {
      background: '#ffffff',
      grid: '#e5e7eb',
      pathSegment: '#1f2937',
      arrow: '#3b82f6',
      vertexTypes: {
        [VertexType.a1]: '#3B82F6',
        [VertexType.a2]: '#60A5FA',
        [VertexType.b1]: '#10B981',
        [VertexType.b2]: '#34D399',
        [VertexType.c1]: '#F59E0B',
        [VertexType.c2]: '#FCD34D',
      },
    },
  };

  return (
    <div className="main-content">
      <CollapsiblePanel title="Controls" side="left" className="control-section">
        <ControlPanel
          isRunning={isRunning}
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
            if (!simulationRef.current) {
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
            } else {
              setIsRunning(true);
            }
          }}
          onPause={handlePause}
          onReset={handleReset}
          onExportImage={handleExportImage}
        />
      </CollapsiblePanel>

      <VisualizationCanvas
        renderer={rendererRef.current}
        latticeState={latticeState}
        onRendererReady={handleRendererReady}
        renderConfig={renderConfig}
      />

      <CollapsiblePanel title="Info" side="right" className="right-panels">
        <div className="right-panels-content">
          <StatisticsPanel stats={stats} fps={fps} />
          <SaveLoadPanel getCurrentData={getCurrentSimulationData} onLoadData={loadSimulationData} />
        </div>
      </CollapsiblePanel>
    </div>
  );
}

export default MainSimulator;
