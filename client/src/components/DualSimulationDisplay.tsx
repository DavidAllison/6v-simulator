import React, { useRef, useEffect, useState } from 'react';
import type { LatticeState } from '../lib/six-vertex/types';
import type { SimulationStats, ConvergenceMetrics } from '../lib/six-vertex/dualSimulation';
import { PathRenderer } from '../lib/six-vertex/renderer/pathRenderer';
import { RenderMode } from '../lib/six-vertex/types';
import './DualSimulationDisplay.css';

interface DualSimulationDisplayProps {
  latticeA: LatticeState | null;
  latticeB: LatticeState | null;
  statsA: SimulationStats | null;
  statsB: SimulationStats | null;
  convergenceMetrics: ConvergenceMetrics | null;
  showArrows: boolean;
  cellSize: number;
}

export function DualSimulationDisplay({
  latticeA,
  latticeB,
  statsA,
  statsB,
  convergenceMetrics,
  showArrows,
  cellSize,
}: DualSimulationDisplayProps) {
  const canvasARef = useRef<HTMLCanvasElement>(null);
  const canvasBRef = useRef<HTMLCanvasElement>(null);
  const [activeTab, setActiveTab] = useState<'side-by-side' | 'tabbed'>('side-by-side');
  const [selectedSimulation, setSelectedSimulation] = useState<'A' | 'B'>('A');

  // Render simulation A
  useEffect(() => {
    if (!latticeA || !canvasARef.current) return;

    const renderer = new PathRenderer(canvasARef.current, {
      cellSize,
      mode: showArrows ? RenderMode.Arrows : RenderMode.Paths,
    });
    renderer.render(latticeA);
  }, [latticeA, showArrows, cellSize]);

  // Render simulation B
  useEffect(() => {
    if (!latticeB || !canvasBRef.current) return;

    const renderer = new PathRenderer(canvasBRef.current, {
      cellSize,
      mode: showArrows ? RenderMode.Arrows : RenderMode.Paths,
    });
    renderer.render(latticeB);
  }, [latticeB, showArrows, cellSize]);

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(2)}M`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  };

  const getConvergenceStatus = () => {
    if (!convergenceMetrics) return { text: 'Initializing...', className: 'status-init' };

    if (convergenceMetrics.isConverged) {
      return { text: 'Converged', className: 'status-converged' };
    } else if (convergenceMetrics.volumeRatio > 0.9) {
      return { text: 'Converging...', className: 'status-converging' };
    } else {
      return { text: 'Divergent', className: 'status-divergent' };
    }
  };

  const convergenceStatus = getConvergenceStatus();

  const renderSimulationPanel = (
    canvasRef: React.RefObject<HTMLCanvasElement | null>,
    stats: SimulationStats | null,
    label: string,
    configType: string,
  ) => {
    const width = latticeA?.width || 0;
    const height = latticeA?.height || 0;
    const canvasSize = cellSize * Math.max(width, height);

    return (
      <div className="simulation-panel">
        <div className="simulation-header">
          <h3>{label}</h3>
          <span className="config-badge">{configType}</span>
        </div>

        <div className="canvas-container">
          <canvas
            ref={canvasRef}
            width={canvasSize}
            height={canvasSize}
            className="simulation-canvas"
          />
        </div>

        {stats && stats.heightData && (
          <div className="simulation-stats">
            <div className="stat-row">
              <span>Volume:</span>
              <strong>{stats.heightData.totalVolume.toFixed(1)}</strong>
            </div>
            <div className="stat-row">
              <span>Avg Height:</span>
              <strong>{stats.heightData.averageHeight.toFixed(3)}</strong>
            </div>
            <div className="stat-row">
              <span>Steps:</span>
              <strong>{formatNumber(stats.totalSteps)}</strong>
            </div>
            <div className="stat-row">
              <span>Success Rate:</span>
              <strong>
                {((stats.flipSuccesses / Math.max(1, stats.flipAttempts)) * 100).toFixed(1)}%
              </strong>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="dual-simulation-display">
      <div className="convergence-header">
        <div className="convergence-status">
          <span className={`status-indicator ${convergenceStatus.className}`}>
            {convergenceStatus.text}
          </span>
          {convergenceMetrics && (
            <>
              <span className="metric">
                Volume Ratio: {(convergenceMetrics.volumeRatio * 100).toFixed(1)}%
              </span>
              <span className="metric">
                Volume Diff: {convergenceMetrics.volumeDifference.toFixed(1)}
              </span>
              <span className="metric">
                Smoothed: {(convergenceMetrics.smoothedDifference * 100).toFixed(2)}%
              </span>
            </>
          )}
        </div>

        <div className="view-toggle">
          <button
            className={activeTab === 'side-by-side' ? 'active' : ''}
            onClick={() => setActiveTab('side-by-side')}
          >
            Side by Side
          </button>
          <button
            className={activeTab === 'tabbed' ? 'active' : ''}
            onClick={() => setActiveTab('tabbed')}
          >
            Tabbed
          </button>
        </div>
      </div>

      {activeTab === 'side-by-side' ? (
        <div className="simulations-container side-by-side">
          {renderSimulationPanel(canvasARef, statsA, 'Simulation A', 'DWBC High')}
          {renderSimulationPanel(canvasBRef, statsB, 'Simulation B', 'DWBC Low')}
        </div>
      ) : (
        <div className="simulations-container tabbed">
          <div className="tab-buttons">
            <button
              className={selectedSimulation === 'A' ? 'active' : ''}
              onClick={() => setSelectedSimulation('A')}
            >
              Simulation A (DWBC High)
            </button>
            <button
              className={selectedSimulation === 'B' ? 'active' : ''}
              onClick={() => setSelectedSimulation('B')}
            >
              Simulation B (DWBC Low)
            </button>
          </div>

          {selectedSimulation === 'A'
            ? renderSimulationPanel(canvasARef, statsA, 'Simulation A', 'DWBC High')
            : renderSimulationPanel(canvasBRef, statsB, 'Simulation B', 'DWBC Low')}
        </div>
      )}

      {convergenceMetrics && convergenceMetrics.historyLength > 0 && (
        <div className="convergence-progress">
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{
                width: `${Math.min(100, (1 - convergenceMetrics.smoothedDifference) * 100)}%`,
              }}
            />
          </div>
          <div className="progress-label">
            Convergence Progress: {((1 - convergenceMetrics.smoothedDifference) * 100).toFixed(1)}%
          </div>
        </div>
      )}
    </div>
  );
}
