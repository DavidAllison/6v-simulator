import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { PageShell } from '../components/PageShell';
import VisualizationCanvas from '../components/VisualizationCanvas';
import { NSimDiffView } from '../components/NSimDiffView';
import { PathRenderer } from '../lib/six-vertex/renderer/pathRenderer';
import { NSimulationManager } from '../lib/six-vertex/nSimulation';
import type {
  NSimConfig,
  NSimInitialState,
  NSimInstanceConfig,
  NSimWeights,
} from '../lib/six-vertex/nSimulation';
import { LARGE_LATTICE_THRESHOLD } from '../lib/six-vertex/simulation';
import { RenderMode } from '../lib/six-vertex/types';
import type {
  LatticeState,
  RawLatticeState,
  RenderConfig,
  SimulationController,
  SimulationStats,
} from '../lib/six-vertex/types';
import { getThemeColors } from '../lib/six-vertex/themeColors';
import { useTheme } from '../hooks/useTheme';
import {
  allConverged,
  combineStop,
  manual,
  maxSteps,
  type StopPredicate,
} from '../lib/six-vertex/stopConditions';
import '../App.css';
import styles from './nSimulation.module.css';

type StopMode = 'manual' | 'max-steps' | 'all-converged';

const MAX_INSTANCES = 6;
const INITIAL_STATE_LABELS: Record<NSimInitialState, string> = {
  'dwbc-high': 'DWBC High',
  'dwbc-low': 'DWBC Low',
  random: 'Random',
};

let instanceCounter = 0;
function makeInstance(initialState: NSimInitialState, label: string): NSimInstanceConfig {
  instanceCounter += 1;
  return {
    id: `inst-${instanceCounter}`,
    label,
    initialState,
    seed: 10000 + Math.floor(Math.random() * 90000),
  };
}

function defaultInstances(): NSimInstanceConfig[] {
  return [makeInstance('dwbc-high', 'Sim 1 · High'), makeInstance('dwbc-low', 'Sim 2 · Low')];
}

/**
 * One simulation instance: owns its PathRenderer (stable per-instance ref) and
 * subscribes to its controller for redraws. Large lattices render via the raw
 * bitmap path (pulled in onStateChange), small ones via the object form —
 * mirroring MainSimulator's large-aware handling and stable onRendererReady.
 */
function InstancePanel({
  controller,
  label,
  initialState,
  seed,
  isLarge,
  renderConfig,
  observable,
}: {
  controller: SimulationController;
  label: string;
  initialState: NSimInitialState;
  seed: number;
  isLarge: boolean;
  renderConfig: Partial<RenderConfig>;
  observable: number;
}) {
  const rendererRef = useRef<PathRenderer | null>(null);
  const [latticeState, setLatticeState] = useState<LatticeState | null>(null);
  const [rawState, setRawState] = useState<RawLatticeState | null>(null);

  const isLargeRef = useRef(isLarge);
  isLargeRef.current = isLarge;
  const latticeStateRef = useRef<LatticeState | null>(null);
  latticeStateRef.current = latticeState;
  const rawStateRef = useRef<RawLatticeState | null>(null);
  rawStateRef.current = rawState;

  // Seed the canvas with the controller's current state, then subscribe for
  // updates. Re-runs only when the controller instance changes (Apply/Reset),
  // not every frame.
  useEffect(() => {
    if (isLargeRef.current) {
      setLatticeState(null);
      const raw = controller.getRawState();
      if (raw) {
        setRawState(raw);
        rendererRef.current?.renderRaw(raw.width, raw.height, raw.vertices);
      }
    } else {
      setRawState(null);
      try {
        const state = controller.getState();
        setLatticeState(state);
        rendererRef.current?.render(state);
      } catch {
        // Worker mode may not have an object state yet; the onStateChange
        // handler will fill it in once the first snapshot arrives.
      }
    }

    const handleStateChange = (state: LatticeState) => {
      if (isLargeRef.current) {
        const raw = controller.getRawState();
        if (raw) {
          setRawState(raw);
          rendererRef.current?.renderRaw(raw.width, raw.height, raw.vertices);
        }
      } else {
        setLatticeState(state);
        rendererRef.current?.render(state);
      }
    };

    controller.on('onStateChange', handleStateChange);
    return () => {
      controller.off('onStateChange', handleStateChange);
    };
  }, [controller]);

  // Stable identity (empty deps + refs) so VisualizationCanvas does not recreate
  // the PathRenderer every frame (that bug crashed the tab for large lattices).
  const handleRendererReady = useCallback((renderer: PathRenderer) => {
    rendererRef.current = renderer;
    const raw = rawStateRef.current;
    if (raw) {
      renderer.renderRaw(raw.width, raw.height, raw.vertices);
    } else if (latticeStateRef.current) {
      renderer.render(latticeStateRef.current);
    }
  }, []);

  return (
    <div className={styles.instanceCard}>
      <div className={styles.instanceHeader}>
        <span className={styles.instanceTitle}>{label}</span>
        <span className={styles.instanceMeta}>
          {INITIAL_STATE_LABELS[initialState]} · seed {seed}
        </span>
      </div>
      <div className={styles.canvasHolder}>
        <VisualizationCanvas
          renderer={rendererRef.current}
          latticeState={isLarge ? null : latticeState}
          rawState={isLarge ? rawState : null}
          onRendererReady={handleRendererReady}
          renderConfig={renderConfig}
        />
      </div>
      <div className={styles.instanceObservable}>Observable (height): {observable.toFixed(2)}</div>
    </div>
  );
}

export function NSimulation() {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  const labelPrefix = useId();

  // Draft config (edited by the controls). Apply rebuilds the manager from it.
  const [size, setSize] = useState(16);
  const [temperature, setTemperature] = useState(1.0);
  const [weights, setWeights] = useState<NSimWeights>({
    a1: 1,
    a2: 1,
    b1: 1,
    b2: 1,
    c1: 1,
    c2: 1,
  });
  const [stepsPerFrame, setStepsPerFrame] = useState(20);
  const [instances, setInstances] = useState<NSimInstanceConfig[]>(defaultInstances);

  // Stop-condition selection.
  const [stopMode, setStopMode] = useState<StopMode>('all-converged');
  const [maxStepsValue, setMaxStepsValue] = useState(50000);
  const [convergenceThreshold, setConvergenceThreshold] = useState(0.05);

  // Live state surfaced to the UI.
  const [controllers, setControllers] = useState<SimulationController[]>([]);
  const [activeInstances, setActiveInstances] = useState<NSimInstanceConfig[]>([]);
  const [isLargeActive, setIsLargeActive] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [spread, setSpread] = useState(0);
  const [snapshots, setSnapshots] = useState<SimulationStats[]>([]);
  const [convergedAtStep, setConvergedAtStep] = useState<number | null>(null);

  const managerRef = useRef<NSimulationManager | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const isRunningRef = useRef(false);
  isRunningRef.current = isRunning;
  // Throttle React state updates (chart + readout re-renders) to ~10 Hz. The MC
  // loop still steps every animation frame; only the UI publish cadence is
  // capped, so a long run doesn't re-render the whole route 60×/s.
  const lastPublishRef = useRef(0);
  const PUBLISH_INTERVAL_MS = 100;

  // Build the active stop predicate from the current selection.
  const stopPredicate = useMemo<StopPredicate>(() => {
    switch (stopMode) {
      case 'max-steps':
        return maxSteps(maxStepsValue).predicate;
      case 'all-converged':
        return combineStop(
          [allConverged({ threshold: convergenceThreshold, window: 30 }).predicate],
          'any',
        );
      case 'manual':
      default:
        return manual().predicate;
    }
  }, [stopMode, maxStepsValue, convergenceThreshold]);
  const stopPredicateRef = useRef(stopPredicate);
  stopPredicateRef.current = stopPredicate;

  // Publish readouts from a single snapshot sweep. Pass pre-computed snapshots
  // (from the tick) to avoid a second getStats() pass; omit for one-shot callers.
  const publishReadouts = useCallback(
    (manager: NSimulationManager, snaps = manager.getSnapshots()) => {
      setSpread(manager.getRelativeSpread(snaps));
      setSnapshots(snaps.map((s) => s.stats));
    },
    [],
  );

  const refreshReadouts = useCallback(() => {
    const manager = managerRef.current;
    if (!manager) return;
    publishReadouts(manager);
  }, [publishReadouts]);

  // Build (or rebuild) the manager from the current draft config.
  const applyConfig = useCallback(() => {
    // Stop the run loop and tear down the old manager (terminates its workers).
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    setIsRunning(false);
    setConvergedAtStep(null);
    managerRef.current?.dispose();

    const config: NSimConfig = {
      size,
      temperature,
      weights: { ...weights },
      instances: instances.map((i) => ({ ...i })),
    };
    const manager = new NSimulationManager(config);
    managerRef.current = manager;

    setControllers(manager.getControllers());
    setActiveInstances(manager.getInstanceConfigs());
    setIsLargeActive(manager.isLarge());
    publishReadouts(manager);
  }, [size, temperature, weights, instances, publishReadouts]);

  // Build on mount and dispose on unmount (terminating workers).
  useEffect(() => {
    applyConfig();
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      managerRef.current?.dispose();
      managerRef.current = null;
    };
    // Only build once on mount; Apply triggers explicit rebuilds.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The rAF tick: for small lattices it drives stepsPerFrame steps; for large
  // lattices the workers self-drive (run() already started them), so the tick
  // only samples history + readouts and evaluates the stop condition.
  const tick = useCallback(() => {
    const manager = managerRef.current;
    if (!manager || !isRunningRef.current) return;

    if (!manager.isLarge()) {
      for (let i = 0; i < stepsPerFrame; i++) {
        manager.step();
      }
    }

    // One snapshot sweep per frame, reused for history, stop check and readouts.
    const snaps = manager.pushHistory();

    if (manager.evaluateStop(stopPredicateRef.current, snaps)) {
      publishReadouts(manager, snaps); // always publish the final state
      setConvergedAtStep(manager.getStep(snaps));
      setIsRunning(false);
      manager.pause();
      return;
    }

    // Throttle UI publishing; the simulation itself keeps stepping every frame.
    const now = performance.now();
    if (now - lastPublishRef.current >= PUBLISH_INTERVAL_MS) {
      lastPublishRef.current = now;
      publishReadouts(manager, snaps);
    }

    animationFrameRef.current = requestAnimationFrame(tick);
  }, [stepsPerFrame, publishReadouts]);

  // Start/stop the run loop.
  useEffect(() => {
    const manager = managerRef.current;
    if (!manager) return;
    if (isRunning) {
      setConvergedAtStep(null);
      lastPublishRef.current = 0; // publish on the very first frame of the run
      if (manager.isLarge()) {
        manager.run();
      }
      animationFrameRef.current = requestAnimationFrame(tick);
    } else {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      manager.pause();
    }
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [isRunning, tick]);

  const handleReset = useCallback(() => {
    setIsRunning(false);
    setConvergedAtStep(null);
    managerRef.current?.reset();
    refreshReadouts();
  }, [refreshReadouts]);

  // Live weight updates apply to the running controllers too.
  const handleWeightChange = useCallback((type: keyof NSimWeights, value: number) => {
    setWeights((prev) => {
      const next = { ...prev, [type]: value };
      managerRef.current?.getControllers().forEach((c) => c.updateParams({ weights: { ...next } }));
      return next;
    });
  }, []);

  const addInstance = useCallback(() => {
    setInstances((prev) => {
      if (prev.length >= MAX_INSTANCES) return prev;
      return [...prev, makeInstance('random', `Sim ${prev.length + 1} · Random`)];
    });
  }, []);

  const removeInstance = useCallback((id: string) => {
    setInstances((prev) => (prev.length <= 1 ? prev : prev.filter((i) => i.id !== id)));
  }, []);

  const updateInstance = useCallback((id: string, patch: Partial<NSimInstanceConfig>) => {
    setInstances((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  }, []);

  const renderConfig: Partial<RenderConfig> = useMemo(
    () => ({
      mode: RenderMode.Paths,
      showGrid: true,
      animateFlips: false,
      cellSize: 30,
      lineWidth: 2,
      colors: getThemeColors(isDarkMode),
    }),
    [isDarkMode],
  );

  const converged = convergedAtStep !== null;
  const observables = snapshots.map((s) =>
    typeof s.height === 'number' ? s.height : s.vertexCounts.c2,
  );

  return (
    <PageShell
      title="N-Simulation Comparison"
      subtitle="Run any number of 6-vertex simulations from mixed initial conditions and stop automatically when they converge."
    >
      <div className={styles.page}>
        <div className={styles.panel}>
          <div className={styles.controlsGrid}>
            <div className="control-group">
              <label>
                Lattice Size: {size}×{size}
                <input
                  type="range"
                  min="4"
                  max="256"
                  value={size}
                  onChange={(e) => setSize(Number(e.target.value))}
                  disabled={isRunning}
                />
              </label>
            </div>

            <div className="control-group">
              <label>
                Temperature: {temperature.toFixed(2)}
                <input
                  type="range"
                  min="0.1"
                  max="2"
                  step="0.1"
                  value={temperature}
                  onChange={(e) => setTemperature(Number(e.target.value))}
                  disabled={isRunning}
                />
              </label>
            </div>

            <div className="control-group">
              <label>
                Speed: {stepsPerFrame} steps/frame
                <input
                  type="range"
                  min="1"
                  max="200"
                  step="1"
                  value={stepsPerFrame}
                  onChange={(e) => setStepsPerFrame(Number(e.target.value))}
                />
              </label>
            </div>
          </div>

          <div className={styles.weightsSection}>
            <h3>Vertex Weights</h3>
            <div className={styles.weightsGrid}>
              {(Object.entries(weights) as [keyof NSimWeights, number][]).map(([type, value]) => (
                <label key={type}>
                  {type.toUpperCase()}: {value.toFixed(1)}
                  <input
                    type="range"
                    min="0.1"
                    max="2"
                    step="0.1"
                    value={value}
                    onChange={(e) => handleWeightChange(type, Number(e.target.value))}
                  />
                </label>
              ))}
            </div>
          </div>

          <div className={styles.instancesSection}>
            <h3>Simulations ({instances.length})</h3>
            {instances.map((instance, idx) => (
              <div key={instance.id} className={styles.instanceRow}>
                <input
                  type="text"
                  value={instance.label}
                  aria-label={`${labelPrefix}-label-${idx}`}
                  onChange={(e) => updateInstance(instance.id, { label: e.target.value })}
                  disabled={isRunning}
                />
                <select
                  value={instance.initialState}
                  aria-label={`Initial state for ${instance.label}`}
                  onChange={(e) =>
                    updateInstance(instance.id, {
                      initialState: e.target.value as NSimInitialState,
                    })
                  }
                  disabled={isRunning}
                >
                  <option value="dwbc-high">DWBC High</option>
                  <option value="dwbc-low">DWBC Low</option>
                  <option value="random">Random</option>
                </select>
                <input
                  type="number"
                  value={instance.seed}
                  aria-label={`Seed for ${instance.label}`}
                  onChange={(e) => updateInstance(instance.id, { seed: Number(e.target.value) })}
                  disabled={isRunning}
                  style={{ width: '6rem' }}
                />
                <button
                  type="button"
                  className="btn btn--secondary"
                  onClick={() => removeInstance(instance.id)}
                  disabled={isRunning || instances.length <= 1}
                >
                  Remove
                </button>
              </div>
            ))}
            <button
              type="button"
              className="btn btn--secondary"
              onClick={addInstance}
              disabled={isRunning || instances.length >= MAX_INSTANCES}
            >
              Add simulation
            </button>
          </div>

          <div className={styles.instancesSection}>
            <h3>Stop Condition</h3>
            <div className={styles.controlsGrid}>
              <div className="control-group">
                <label>
                  Condition
                  <select
                    value={stopMode}
                    onChange={(e) => setStopMode(e.target.value as StopMode)}
                    disabled={isRunning}
                  >
                    <option value="all-converged">All converged</option>
                    <option value="max-steps">Max steps</option>
                    <option value="manual">Manual</option>
                  </select>
                </label>
              </div>
              {stopMode === 'max-steps' && (
                <div className="control-group">
                  <label>
                    Max steps
                    <input
                      type="number"
                      min="1"
                      value={maxStepsValue}
                      onChange={(e) => setMaxStepsValue(Number(e.target.value))}
                      disabled={isRunning}
                    />
                  </label>
                </div>
              )}
              {stopMode === 'all-converged' && (
                <div className="control-group">
                  <label>
                    Threshold: {(convergenceThreshold * 100).toFixed(0)}%
                    <input
                      type="range"
                      min="0.01"
                      max="0.25"
                      step="0.01"
                      value={convergenceThreshold}
                      onChange={(e) => setConvergenceThreshold(Number(e.target.value))}
                      disabled={isRunning}
                    />
                  </label>
                </div>
              )}
            </div>
          </div>

          <div className={styles.actionButtons}>
            <button
              type="button"
              onClick={() => setIsRunning((r) => !r)}
              className={`btn ${isRunning ? 'btn--danger' : 'btn--success'}`}
            >
              {isRunning ? 'Pause' : 'Run'}
            </button>
            <button type="button" onClick={handleReset} className="btn btn--primary">
              Reset
            </button>
            <button
              type="button"
              onClick={applyConfig}
              disabled={isRunning}
              className="btn btn--secondary"
            >
              Apply
            </button>
            {converged && <span className={styles.badge}>Converged at step {convergedAtStep}</span>}
          </div>
        </div>

        <div className={styles.convergencePanel}>
          <div>
            <div className={styles.metricLabel}>Relative spread</div>
            <div className={styles.metricValue}>{(spread * 100).toFixed(2)}%</div>
          </div>
          <div>
            <div className={styles.metricLabel}>Instances</div>
            <div className={styles.metricValue}>{activeInstances.length}</div>
          </div>
          <div>
            <div className={styles.metricLabel}>Status</div>
            <div className={`${styles.statusValue} ${converged ? styles.statusConverged : ''}`}>
              {converged ? 'Converged ✓' : isRunning ? 'Running…' : 'Idle'}
            </div>
          </div>
        </div>

        <div className={styles.grid}>
          {controllers.map((controller, idx) => (
            <InstancePanel
              key={activeInstances[idx]?.id ?? idx}
              controller={controller}
              label={activeInstances[idx]?.label ?? `Sim ${idx + 1}`}
              initialState={activeInstances[idx]?.initialState ?? 'random'}
              seed={activeInstances[idx]?.seed ?? 0}
              isLarge={isLargeActive}
              renderConfig={renderConfig}
              observable={observables[idx] ?? 0}
            />
          ))}
        </div>

        {controllers.length >= 2 && (
          <div className={styles.panel}>
            <NSimDiffView
              controllers={controllers}
              labels={controllers.map((_, idx) => activeInstances[idx]?.label ?? `Sim ${idx + 1}`)}
              isDark={isDarkMode}
            />
          </div>
        )}

        <div className={styles.panel}>
          <h3>About N-Simulation Comparison</h3>
          <p>
            This page runs several 6-vertex Monte Carlo simulations in parallel. They share the same
            lattice size, temperature and vertex weights but start from different initial conditions
            (DWBC High, DWBC Low, or Random) and different random seeds. The system tracks a coarse
            macroscopic observable (the height function, falling back to the c<sub>2</sub> count)
            for each simulation and reports the relative spread across all of them.
          </p>
          <ul>
            <li>
              <strong>All converged</strong>: stops once the relative spread stays at or below the
              threshold for a full window of recent samples, with at least two simulations.
            </li>
            <li>
              <strong>Max steps</strong>: stops once the leading simulation reaches the chosen step
              count.
            </li>
            <li>
              <strong>Manual</strong>: runs until you press Pause.
            </li>
          </ul>
          <p>
            Lattices larger than {LARGE_LATTICE_THRESHOLD} render via the fast bitmap path and run
            inside Web Workers, one per simulation.
          </p>
        </div>
      </div>
    </PageShell>
  );
}

export default NSimulation;
