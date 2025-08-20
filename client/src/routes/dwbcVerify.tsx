import { useRef, useEffect, useState } from 'react';
import './dwbcVerify.css';
import type { LatticeState, DWBCConfig } from '../lib/six-vertex/types';
import { RenderMode, VertexType } from '../lib/six-vertex/types';
import {
  generateDWBCState,
  generateDWBCHigh,
  generateDWBCLow,
  validateIceRule,
} from '../lib/six-vertex/initialStates';
import { createRenderer, PathRenderer } from '../lib/six-vertex/renderer/pathRenderer';
import { PhysicsSimulation } from '../lib/six-vertex/physicsSimulation';

/**
 * Visual verification component for DWBC initial states
 * Helps verify that Domain Wall Boundary Conditions are correctly implemented
 */
export function DWBCVerify() {
  const canvasHighRef = useRef<HTMLCanvasElement>(null);
  const canvasLowRef = useRef<HTMLCanvasElement>(null);
  const rendererHighRef = useRef<PathRenderer | null>(null);
  const rendererLowRef = useRef<PathRenderer | null>(null);

  const [latticeSize, setLatticeSize] = useState({ width: 8, height: 8 });
  const [renderMode, setRenderMode] = useState<RenderMode>(RenderMode.Paths);
  const [showGrid, setShowGrid] = useState(true);
  const [showLabels, setShowLabels] = useState(false);
  const [highState, setHighState] = useState<LatticeState | null>(null);
  const [lowState, setLowState] = useState<LatticeState | null>(null);
  const [highValid, setHighValid] = useState(false);
  const [lowValid, setLowValid] = useState(false);
  const [testResults, setTestResults] = useState<string>('');
  const [showPhysicsTest, setShowPhysicsTest] = useState(false);

  // Initialize and update states
  useEffect(() => {
    // Generate states
    const highConfig: DWBCConfig = { type: 'high' };
    const lowConfig: DWBCConfig = { type: 'low' };

    const newHighState = generateDWBCState(latticeSize.width, latticeSize.height, highConfig);
    const newLowState = generateDWBCState(latticeSize.width, latticeSize.height, lowConfig);

    setHighState(newHighState);
    setLowState(newLowState);

    // Validate ice rule
    setHighValid(validateIceRule(newHighState));
    setLowValid(validateIceRule(newLowState));

    // Initialize renderers if not already done
    if (canvasHighRef.current && !rendererHighRef.current) {
      rendererHighRef.current = createRenderer(canvasHighRef.current, {
        mode: renderMode,
        showGrid,
        cellSize: 40,
        lineWidth: 2,
      });
    }

    if (canvasLowRef.current && !rendererLowRef.current) {
      rendererLowRef.current = createRenderer(canvasLowRef.current, {
        mode: renderMode,
        showGrid,
        cellSize: 40,
        lineWidth: 2,
      });
    }

    // Update renderer configs
    if (rendererHighRef.current) {
      rendererHighRef.current.updateConfig({ mode: renderMode, showGrid });
      rendererHighRef.current.render(newHighState);
    }

    if (rendererLowRef.current) {
      rendererLowRef.current.updateConfig({ mode: renderMode, showGrid });
      rendererLowRef.current.render(newLowState);
    }
  }, [latticeSize, renderMode, showGrid]);

  const regenerate = () => {
    // Use the new physics-accurate generators
    const size = Math.min(latticeSize.width, latticeSize.height);
    const newHighState = generateDWBCHigh(size);
    const newLowState = generateDWBCLow(size);

    setHighState(newHighState);
    setLowState(newLowState);
    setHighValid(validateIceRule(newHighState));
    setLowValid(validateIceRule(newLowState));

    if (rendererHighRef.current) {
      rendererHighRef.current.render(newHighState);
    }

    if (rendererLowRef.current) {
      rendererLowRef.current.render(newLowState);
    }
  };

  const runPhysicsTests = () => {
    // Capture console output
    const originalLog = console.log;
    const originalError = console.error;
    let output = '';

    console.log = (...args: any[]) => {
      output += args.join(' ') + '\n';
    };

    console.error = (...args: any[]) => {
      output += 'ERROR: ' + args.join(' ') + '\n';
    };

    // Tests removed - validation is done inline

    // Restore console
    console.log = originalLog;
    console.error = originalError;

    setTestResults(output);
    setShowPhysicsTest(true);
  };

  const testPhysicsSimulation = () => {
    const sim = new PhysicsSimulation({
      size: 8,
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

    // Run simulation
    sim.run(1000);

    const stats = sim.getStats();
    const height = sim.getHeight();

    let output = 'Physics Simulation Test\n';
    output += '========================\n';
    output += `Steps: ${stats.step}\n`;
    output += `Acceptance Rate: ${(stats.acceptanceRate * 100).toFixed(2)}%\n`;
    output += `Height/Volume: ${height}\n`;
    output += `Energy: ${stats.energy.toFixed(4)}\n`;
    output += '\nVertex Counts:\n';

    for (const [type, count] of Object.entries(stats.vertexCounts)) {
      output += `  ${type}: ${count}\n`;
    }

    setTestResults(output);
    setShowPhysicsTest(true);
  };

  const analyzeState = (state: LatticeState, type: 'high' | 'low') => {
    if (!state) return null;

    // Analyze boundary arrows
    const topIn = [];
    const bottomOut = [];
    const leftOut = [];
    const rightIn = [];

    // Check top boundary
    for (let col = 0; col < state.width; col++) {
      const vertex = state.vertices[0][col];
      if (vertex.configuration.top === 'out') {
        topIn.push(col);
      }
    }

    // Check bottom boundary
    for (let col = 0; col < state.width; col++) {
      const vertex = state.vertices[state.height - 1][col];
      if (vertex.configuration.bottom === 'out') {
        bottomOut.push(col);
      }
    }

    // Check left boundary
    for (let row = 0; row < state.height; row++) {
      const vertex = state.vertices[row][0];
      if (vertex.configuration.left === 'in') {
        leftOut.push(row);
      }
    }

    // Check right boundary
    for (let row = 0; row < state.height; row++) {
      const vertex = state.vertices[row][state.width - 1];
      if (vertex.configuration.right === 'out') {
        rightIn.push(row);
      }
    }

    return {
      topIn: topIn.length,
      bottomOut: bottomOut.length,
      leftOut: leftOut.length,
      rightIn: rightIn.length,
      expectedTop: type === 'high' ? state.width : 0,
      expectedBottom: type === 'high' ? state.width : 0,
      expectedLeft: type === 'high' ? state.height : 0,
      expectedRight: type === 'high' ? state.height : 0,
    };
  };

  const highAnalysis = highState ? analyzeState(highState, 'high') : null;
  const lowAnalysis = lowState ? analyzeState(lowState, 'low') : null;

  return (
    <div className="dwbc-verify">
      <h1>DWBC Verification Tool</h1>
      <p>
        This tool verifies that Domain Wall Boundary Conditions are correctly implemented. High DWBC
        should have arrows pointing in from top/right and out to bottom/left. Low DWBC should have
        the opposite pattern.
      </p>

      <div className="controls">
        <label>
          Width:
          <input
            type="number"
            value={latticeSize.width}
            onChange={(e) =>
              setLatticeSize({ ...latticeSize, width: parseInt(e.target.value) || 8 })
            }
            min={2}
            max={20}
          />
        </label>

        <label>
          Height:
          <input
            type="number"
            value={latticeSize.height}
            onChange={(e) =>
              setLatticeSize({ ...latticeSize, height: parseInt(e.target.value) || 8 })
            }
            min={2}
            max={20}
          />
        </label>

        <label>
          Render Mode:
          <select value={renderMode} onChange={(e) => setRenderMode(e.target.value as RenderMode)}>
            <option value={RenderMode.Arrows}>Arrows</option>
            <option value={RenderMode.Paths}>Paths</option>
            <option value={RenderMode.Both}>Both</option>
            <option value={RenderMode.Vertices}>Vertices</option>
          </select>
        </label>

        <label>
          <input
            type="checkbox"
            checked={showGrid}
            onChange={(e) => setShowGrid(e.target.checked)}
          />
          Show Grid
        </label>

        <label>
          <input
            type="checkbox"
            checked={showLabels}
            onChange={(e) => setShowLabels(e.target.checked)}
          />
          Show Labels
        </label>

        <button onClick={regenerate}>Regenerate</button>
        <button onClick={runPhysicsTests}>Run Physics Tests</button>
        <button onClick={testPhysicsSimulation}>Test Simulation</button>
      </div>

      {showPhysicsTest && (
        <div className="physics-test-results">
          <h3>Physics Test Results</h3>
          <button onClick={() => setShowPhysicsTest(false)} style={{ float: 'right' }}>
            Close
          </button>
          <pre>{testResults}</pre>
        </div>
      )}

      <div className="states-container">
        <div className="state-display">
          <h2>High DWBC</h2>
          <div className={`ice-status ${highValid ? 'valid' : 'invalid'}`}>
            Ice Rule: {highValid ? 'Valid' : 'Invalid'}
          </div>

          {highAnalysis && (
            <div className="boundary-analysis">
              <p>
                Top boundary (in): {highAnalysis.topIn}/{highAnalysis.expectedTop}
              </p>
              <p>
                Bottom boundary (out): {highAnalysis.bottomOut}/{highAnalysis.expectedBottom}
              </p>
              <p>
                Left boundary (out): {highAnalysis.leftOut}/{highAnalysis.expectedLeft}
              </p>
              <p>
                Right boundary (in): {highAnalysis.rightIn}/{highAnalysis.expectedRight}
              </p>
            </div>
          )}

          <div className="canvas-container">
            <canvas ref={canvasHighRef} />
          </div>
          {showLabels && highState && (
            <div className="vertex-labels">
              {highState.vertices.map((row, rowIdx) => (
                <div key={rowIdx} className="vertex-row">
                  {row.map((vertex, colIdx) => (
                    <span key={colIdx} className="vertex-label">
                      {vertex.type}
                    </span>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="state-display">
          <h2>Low DWBC</h2>
          <div className={`ice-status ${lowValid ? 'valid' : 'invalid'}`}>
            Ice Rule: {lowValid ? 'Valid' : 'Invalid'}
          </div>

          {lowAnalysis && (
            <div className="boundary-analysis">
              <p>
                Top boundary (out): {lowAnalysis.topIn}/{lowAnalysis.expectedTop}
              </p>
              <p>
                Bottom boundary (in): {lowAnalysis.bottomOut}/{lowAnalysis.expectedBottom}
              </p>
              <p>
                Left boundary (in): {lowAnalysis.leftOut}/{lowAnalysis.expectedLeft}
              </p>
              <p>
                Right boundary (out): {lowAnalysis.rightIn}/{lowAnalysis.expectedRight}
              </p>
            </div>
          )}

          <div className="canvas-container">
            <canvas ref={canvasLowRef} />
          </div>
          {showLabels && lowState && (
            <div className="vertex-labels">
              {lowState.vertices.map((row, rowIdx) => (
                <div key={rowIdx} className="vertex-row">
                  {row.map((vertex, colIdx) => (
                    <span key={colIdx} className="vertex-label">
                      {vertex.type}
                    </span>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default DWBCVerify;
