import { useState, useRef, useEffect, useCallback } from 'react';
import type {
  SimulationController,
  LatticeState,
  RawLatticeState,
  SimulationParams,
  SimulationStats,
  RenderConfig,
} from './lib/six-vertex/types';
import { RenderMode, BoundaryCondition } from './lib/six-vertex/types';
import { createSimulation, LARGE_LATTICE_THRESHOLD } from './lib/six-vertex/simulation';
import type { SimulationConfig } from './lib/six-vertex/simulation';
import { PathRenderer } from './lib/six-vertex/renderer/pathRenderer';
import ControlPanel from './components/ControlPanel';
import StatisticsPanel from './components/StatisticsPanel';
import { anisotropyDelta } from './lib/six-vertex/observables';
import VisualizationCanvas from './components/VisualizationCanvas';
import { SaveLoadPanel } from './components/SaveLoadPanel';
import { CollapsiblePanel } from './components/CollapsiblePanel';
import IntroPanel from './components/IntroPanel';
import PresetBar from './components/PresetBar';
import type { PresetConfig } from './components/PresetBar';
import type { SimulationData } from './lib/storage';
import { useTheme } from './hooks/useTheme';
import { getThemeColors } from './lib/six-vertex/themeColors';

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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [stats, setStats] = useState<SimulationStats | null>(null);
  const [latticeState, setLatticeState] = useState<LatticeState | null>(null);
  // Compact typed-array state used for large lattices (avoids ~N*N object churn).
  const [rawState, setRawState] = useState<RawLatticeState | null>(null);
  const [latticeSize, setLatticeSize] = useState(10);
  const [fps, setFps] = useState(0);
  const [stepsPerFrame, setStepsPerFrame] = useState(10);

  // Large lattices render from the raw typed array rather than the object form.
  const isLarge = latticeSize > LARGE_LATTICE_THRESHOLD;
  const isLargeRef = useRef(isLarge);
  isLargeRef.current = isLarge;

  // Pull the latest compact snapshot from the engine into React state so the
  // canvas redraws via the fast bitmap path. Used for large lattices instead of
  // the per-step onStateChange object payload.
  const pullRawState = useCallback(() => {
    const raw = simulationRef.current?.getRawState();
    if (raw) {
      setRawState(raw);
    }
  }, []);

  // Refs mirror the latest state so callbacks (notably onRendererReady) can read
  // them without changing identity every frame. Without this, a renderer-ready
  // callback that closed over rawState/latticeState would be recreated each
  // frame during a run, re-running the renderer-creation effect and allocating a
  // fresh PathRenderer (and large canvas context) per frame — which crashes the
  // tab for big lattices.
  const latticeStateRef = useRef<LatticeState | null>(null);
  latticeStateRef.current = latticeState;
  const rawStateRef = useRef<RawLatticeState | null>(null);
  rawStateRef.current = rawState;

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
        // Offload the MC loop to a Web Worker for large lattices. The facade
        // gates this internally to size > LARGE_LATTICE_THRESHOLD and falls back
        // to the main thread when workers are unavailable, so small lattices and
        // step-by-step debugging keep their synchronous behavior.
        useWorker: true,
        workerThreshold: 50,
      };

      // Dispose the controller we're about to replace so its Web Worker (if any)
      // is terminated rather than leaked. Idempotent with the effect cleanup.
      simulationRef.current?.dispose?.();

      const simulation = createSimulation(params, simConfig);
      simulationRef.current = simulation;

      // Initialize lattice
      simulation.initialize(latticeSize, latticeSize, params);

      if (simulation) {
        const large = latticeSize > LARGE_LATTICE_THRESHOLD;
        setStats(simulation.getStats());
        if (large) {
          // Large lattices render from the compact typed array; never build the
          // ~N*N object form or draw per-cell paths.
          setLatticeState(null);
          const raw = simulation.getRawState();
          if (raw) {
            setRawState(raw);
            rendererRef.current?.renderRaw(raw.width, raw.height, raw.vertices);
          }
        } else {
          setRawState(null);
          const state = simulation.getState();
          setLatticeState(state);
          rendererRef.current?.render(state);
        }
      }

      // Set up event handlers
      simulation.on('onStateChange', (state: LatticeState) => {
        if (isLargeRef.current) {
          // Ignore the object payload; pull the compact snapshot instead.
          const raw = simulationRef.current?.getRawState();
          if (raw) {
            setRawState(raw);
            rendererRef.current?.renderRaw(raw.width, raw.height, raw.vertices);
          }
        } else {
          setLatticeState(state);
          rendererRef.current?.render(state);
        }
      });

      simulation.on('onStep', (newStats: SimulationStats) => {
        setStats(newStats);
      });
    } catch (error) {
      console.error('Failed to initialize simulation:', error);
      // Show error in UI instead of crashing
      setErrorMessage(`Failed to initialize simulation: ${error}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latticeSize, temperature, boundaryCondition, dwbcType, seed]);

  // Re-initialize when key parameters change
  useEffect(() => {
    initializeSimulation();

    const previous = simulationRef.current;
    return () => {
      if (previous?.isRunning()) {
        previous.pause();
      }
      // Terminate the discarded controller's Web Worker so threads don't leak
      // across re-inits (size/seed/boundary changes recreate the simulation).
      previous?.dispose?.();
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [latticeSize, boundaryCondition, dwbcType, seed, initializeSimulation]); // Re-initialize on these changes

  // Handle renderer ready. Stable identity (empty deps + refs) so the
  // renderer-creation effect in VisualizationCanvas does not re-run every frame.
  const handleRendererReady = useCallback((renderer: PathRenderer) => {
    rendererRef.current = renderer;
    const raw = rawStateRef.current;
    if (raw) {
      renderer.renderRaw(raw.width, raw.height, raw.vertices);
    } else if (latticeStateRef.current) {
      renderer.render(latticeStateRef.current);
    }
  }, []);

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
        // Large lattices don't emit an object onStateChange; pull raw to redraw.
        if (isLargeRef.current) {
          pullRawState();
        }
      } else {
        console.error('Simulation not initialized');
        // Don't call initializeSimulation here to avoid circular dependency
      }
    } catch (error) {
      console.error('Error during step:', error);
      setErrorMessage(`Error during step: ${error}`);
    }
  }, [pullRawState]);

  const runSimulation = useCallback(() => {
    if (!simulationRef.current || !isRunning) return;

    try {
      // Large lattices run inside a Web Worker: hand off to the facade's run()
      // (which starts the worker's continuous loop) ONCE — the worker then pushes
      // stats + raw snapshots via onStep/onStateChange, which redraw the canvas.
      // Do NOT also drive a main-thread step loop here (would diverge/double-run).
      if (isLargeRef.current) {
        void simulationRef.current.run(Number.MAX_SAFE_INTEGER);
        return;
      }

      // Small lattices stay fully synchronous on the main thread: step N times
      // per animation frame and redraw from the object state via onStateChange.
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

  // Apply a one-click preset scenario. Reuses the exact setters the sliders
  // use (so the controls reflect the new values) and forces a single clean
  // re-initialization via the same seed-bump path that handleReset uses:
  // changing the seed/size recreates initializeSimulation, whose effect rebuilds
  // the simulation reading the freshly-set weights and boundary config.
  const handleApplyPreset = useCallback(
    (config: PresetConfig) => {
      handlePause();

      // Clamp lattice size to the bounds the ControlPanel enforces (4–1024).
      const clampedSize = Math.min(1024, Math.max(4, Math.round(config.latticeSize)));

      setBoundaryCondition(config.boundaryCondition);
      setDwbcType(config.dwbcType);
      setLatticeSize(clampedSize);
      setWeights({ ...config.weights });
      // Seed bump guarantees the re-init effect fires even if size/config match
      // the current state, mirroring handleReset's fresh-start behavior.
      setSeed((prev) => prev + 1);

      // The re-init effect runs (and replaces simulationRef.current) before the
      // run effect on the same commit, so it is safe to request a run here.
      setIsRunning(config.run);
    },
    [handlePause],
  );

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

        const large = data.latticeState.width > LARGE_LATTICE_THRESHOLD;

        // Import the data into the simulation
        if (simulationRef.current) {
          simulationRef.current.importData({
            state: data.latticeState,
            params: data.params,
            stats: data.stats,
          });

          // Update local state to match loaded data
          setStats(simulationRef.current.getStats());
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

          // Re-render the loaded state. Large lattices use the compact bitmap
          // path (pulled from the engine, which importData now actually loads);
          // building the per-cell object form for ~1M cells would freeze the tab.
          if (large) {
            setLatticeState(null);
            const raw = simulationRef.current.getRawState();
            if (raw) {
              setRawState(raw);
              rendererRef.current?.renderRaw(raw.width, raw.height, raw.vertices);
            }
          } else {
            setRawState(null);
            setLatticeState(data.latticeState);
            rendererRef.current?.render(data.latticeState);
          }
        } else {
          // If no simulation exists, create one with the loaded params
          const params: SimulationParams = data.params;
          const simConfig: SimulationConfig = {
            useOptimized: true,
            useWorker: true,
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
          setStats(simulation.getStats());
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

          // Render the freshly imported state (large via bitmap, else objects).
          if (large) {
            setLatticeState(null);
            const raw = simulation.getRawState();
            if (raw) {
              setRawState(raw);
              rendererRef.current?.renderRaw(raw.width, raw.height, raw.vertices);
            }
          } else {
            setRawState(null);
            setLatticeState(data.latticeState);
            rendererRef.current?.render(data.latticeState);
          }

          // Set up event handlers (large-aware, mirroring initializeSimulation).
          simulation.on('onStep', (newStats) => {
            setStats(newStats);
          });

          simulation.on('onStateChange', (newState) => {
            if (isLargeRef.current) {
              const raw = simulationRef.current?.getRawState();
              if (raw) {
                setRawState(raw);
                rendererRef.current?.renderRaw(raw.width, raw.height, raw.vertices);
              }
            } else {
              setLatticeState(newState);
              rendererRef.current?.render(newState);
            }
          });
        }

        console.log('Simulation loaded successfully');
      } catch (error) {
        console.error('Failed to load simulation data:', error);
        setErrorMessage('Failed to load simulation. Please check the console for details.');
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
      {errorMessage && (
        <div className="alert alert--danger simulator-alert" role="alert">
          <span className="simulator-alert__message">{errorMessage}</span>
          <button
            type="button"
            className="simulator-alert__dismiss"
            aria-label="Dismiss notification"
            onClick={() => setErrorMessage(null)}
          >
            &times;
          </button>
        </div>
      )}
      <IntroPanel />
      <PresetBar onApplyPreset={handleApplyPreset} />
      <div className="simulator-workspace">
        <CollapsiblePanel title="Controls" side="left" className="panel-section">
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
                    setErrorMessage('Failed to initialize simulation. Please try resetting.');
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
          latticeState={isLarge ? null : latticeState}
          rawState={isLarge ? rawState : null}
          onRendererReady={handleRendererReady}
          renderConfig={renderConfig}
        />

        <CollapsiblePanel title="Info" side="right" className="panel-section">
          <StatisticsPanel
            stats={stats}
            fps={fps}
            temperature={temperature}
            beta={1.0 / temperature}
            delta={anisotropyDelta(weights)}
          />
          <SaveLoadPanel
            getCurrentData={getCurrentSimulationData}
            onLoadData={loadSimulationData}
          />
        </CollapsiblePanel>
      </div>
    </div>
  );
}

export default MainSimulator;
