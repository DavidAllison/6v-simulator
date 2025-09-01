import React, { useState } from 'react';
import { CanvasDebugTest } from './components/CanvasDebugTest';
import { DirectCanvasTest } from './components/DirectCanvasTest';
import { DualSimulationDisplay } from './components/DualSimulationDisplay';
import type { DWBCConfig } from './lib/six-vertex/types';
import { generateDWBCState } from './lib/six-vertex/initialStates';

export function TestCanvasPage() {
  const [showDebug, setShowDebug] = useState(true);
  const [simulations] = useState(() => {
    const configHigh: DWBCConfig = { type: 'high' };
    const configLow: DWBCConfig = { type: 'low' };
    return {
      latticeA: generateDWBCState(8, 8, configHigh),
      latticeB: generateDWBCState(8, 8, configLow),
    };
  });

  return (
    <div style={{ padding: '20px', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <h1>Canvas Test Page</h1>

      <div style={{ marginBottom: '20px' }}>
        <button onClick={() => setShowDebug(!showDebug)}>
          {showDebug ? 'Hide' : 'Show'} Debug Canvas
        </button>
      </div>

      {showDebug && (
        <>
          <CanvasDebugTest />
          <DirectCanvasTest />
        </>
      )}

      <div style={{ flex: 1, minHeight: 0, marginTop: '20px' }}>
        <h2>Dual Simulation Display (with PanZoomCanvas)</h2>
        <DualSimulationDisplay
          latticeA={simulations.latticeA}
          latticeB={simulations.latticeB}
          showArrows={false}
          cellSize={30}
        />
      </div>
    </div>
  );
}
