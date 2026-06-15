import React, { useMemo, useState } from 'react';
import { BoundaryCondition, RenderMode } from '../lib/six-vertex/types';
import type { VertexType } from '../lib/six-vertex/types';
import { getCurrentVertexColors } from '../lib/six-vertex/themeColors';
import { useTheme } from '../hooks/useTheme';
import { VertexLegend } from './VertexEdgeVisualization';
import './ControlPanel.css';

interface ControlPanelProps {
  // Simulation state
  isRunning: boolean;

  // Lattice parameters
  latticeSize: number;
  temperature: number;
  seed: number;
  boundaryCondition: BoundaryCondition;
  dwbcType: 'high' | 'low';

  // Vertex weights
  weights: {
    a1: number;
    a2: number;
    b1: number;
    b2: number;
    c1: number;
    c2: number;
  };

  // Render settings
  renderMode: RenderMode;
  showGrid: boolean;
  animateFlips: boolean;
  stepsPerFrame: number;

  // Event handlers
  onLatticeSizeChange: (size: number) => void;
  onTemperatureChange: (temp: number) => void;
  onSeedChange: (seed: number) => void;
  onBoundaryConditionChange: (bc: BoundaryCondition) => void;
  onDwbcTypeChange: (type: 'high' | 'low') => void;
  onWeightChange: (type: string, value: number) => void;
  onRenderModeChange: (mode: RenderMode) => void;
  onShowGridChange: (show: boolean) => void;
  onAnimateFlipsChange: (animate: boolean) => void;
  onStepsPerFrameChange: (steps: number) => void;
  onStep: () => void;
  onRun: () => void;
  onPause: () => void;
  onReset: () => void;
  onExportImage: () => void;
}

const ControlPanel: React.FC<ControlPanelProps> = ({
  isRunning,
  latticeSize,
  temperature,
  seed,
  boundaryCondition,
  dwbcType,
  weights,
  renderMode,
  showGrid,
  animateFlips,
  stepsPerFrame,
  onLatticeSizeChange,
  onTemperatureChange,
  onSeedChange,
  onBoundaryConditionChange,
  onDwbcTypeChange,
  onWeightChange,
  onRenderModeChange,
  onShowGridChange,
  onAnimateFlipsChange,
  onStepsPerFrameChange,
  onStep,
  onRun,
  onPause,
  onReset,
  onExportImage,
}) => {
  const [showLegend, setShowLegend] = useState(false);
  const { theme } = useTheme();

  // Single source of truth: the canonical theme-aware vertex palette shared
  // with the Canvas renderer and the StatisticsPanel legend. Recomputed when
  // the active theme changes so the weight swatches match the canvas exactly.
  // `theme` is the intentional recompute trigger (getCurrentVertexColors reads
  // the active data-theme from the DOM, which `theme` keeps in sync).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const vertexColors = useMemo(() => getCurrentVertexColors(), [theme]);

  return (
    <div className="control-panel">
      {/* Simulation Controls */}
      <div className="control-section">
        <h3>
          <svg className="section-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          Simulation Controls
        </h3>
        <div className="button-group">
          <button onClick={onStep} disabled={isRunning} className="control-button">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11.933 12.8a1 1 0 000-1.6L6.6 7.2A1 1 0 005 8v8a1 1 0 001.6.8l5.333-4zM19.933 12.8a1 1 0 000-1.6l-5.333-4A1 1 0 0013 8v8a1 1 0 001.6.8l5.333-4z"
              />
            </svg>
            Step
          </button>
          {!isRunning ? (
            <button onClick={onRun} className="control-button primary">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                />
              </svg>
              Run
            </button>
          ) : (
            <button onClick={onPause} className="control-button warning">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              Pause
            </button>
          )}
          <button onClick={onReset} className="control-button">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Reset
          </button>
        </div>

        <div className="control-item">
          <label>
            <span>Speed (steps/frame)</span>
            <div className="slider-with-value">
              <input
                type="range"
                value={Math.log10(stepsPerFrame)}
                onChange={(e) => onStepsPerFrameChange(Math.pow(10, parseFloat(e.target.value)))}
                min={0}
                max={3}
                step={0.1}
                className="slider"
                aria-label="Speed (steps per frame)"
                aria-valuetext={`${Math.round(stepsPerFrame)} steps per frame`}
              />
              <output className="value-display" aria-live="polite">
                {Math.round(stepsPerFrame)}
              </output>
            </div>
          </label>
        </div>
      </div>

      {/* Lattice Configuration */}
      <div className="control-section">
        <h3>
          <svg className="section-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"
            />
          </svg>
          Lattice Configuration
        </h3>

        <div className="control-item">
          <label>
            <span>Lattice Size (N×N)</span>
            <div className="slider-with-value">
              <input
                type="range"
                value={latticeSize}
                onChange={(e) => onLatticeSizeChange(parseInt(e.target.value))}
                min={4}
                max={100}
                step={1}
                className="slider"
                aria-label="Lattice size (N by N)"
                aria-valuetext={`${latticeSize} by ${latticeSize}`}
              />
              <output className="value-display" aria-live="polite">
                {latticeSize}
              </output>
            </div>
          </label>
        </div>

        <div className="control-item">
          <label>
            <span>Initial State</span>
            <select
              value={boundaryCondition}
              onChange={(e) => onBoundaryConditionChange(e.target.value as BoundaryCondition)}
              className="select-input"
            >
              <option value={BoundaryCondition.DWBC}>Domain Wall (DWBC)</option>
              <option value={BoundaryCondition.Periodic}>Periodic</option>
              <option value={BoundaryCondition.Open}>Random</option>
            </select>
          </label>
        </div>

        {boundaryCondition === BoundaryCondition.DWBC && (
          <div className="control-item">
            <label>
              <span>DWBC Type</span>
              <div className="radio-group">
                <label className="radio-label">
                  <input
                    type="radio"
                    value="high"
                    checked={dwbcType === 'high'}
                    onChange={() => onDwbcTypeChange('high')}
                  />
                  <span>High</span>
                </label>
                <label className="radio-label">
                  <input
                    type="radio"
                    value="low"
                    checked={dwbcType === 'low'}
                    onChange={() => onDwbcTypeChange('low')}
                  />
                  <span>Low</span>
                </label>
              </div>
            </label>
          </div>
        )}

        <div className="control-item">
          <label>
            <span>Random Seed</span>
            <input
              type="number"
              value={seed}
              onChange={(e) => onSeedChange(parseInt(e.target.value) || 0)}
              className="number-input"
            />
          </label>
        </div>
      </div>

      {/* Physics Parameters */}
      <div className="control-section">
        <h3>
          <svg className="section-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 10V3L4 14h7v7l9-11h-7z"
            />
          </svg>
          Physics Parameters
        </h3>

        <div className="control-item">
          <label>
            <span>Temperature (T)</span>
            <div className="slider-with-value">
              <input
                type="range"
                value={temperature}
                onChange={(e) => onTemperatureChange(parseFloat(e.target.value))}
                min={0.1}
                max={10}
                step={0.1}
                className="slider"
                aria-label="Temperature (T)"
                aria-valuetext={temperature.toFixed(1)}
              />
              <output className="value-display" aria-live="polite">
                {temperature.toFixed(1)}
              </output>
            </div>
          </label>
        </div>

        <div className="weights-grid">
          <h4>Vertex Weights</h4>
          {Object.entries(weights).map(([type, weight]) => {
            const color = vertexColors[type as VertexType] ?? 'var(--color-text-muted)';
            const fillPercent = ((weight - 0.1) / 4.9) * 100;
            return (
              <div key={type} className="weight-control">
                <div className="weight-header">
                  <span className="weight-label" style={{ color }}>
                    {type}
                  </span>
                  <span className="weight-value">{weight.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  value={weight}
                  onChange={(e) => onWeightChange(type, parseFloat(e.target.value))}
                  min={0.1}
                  max={5}
                  step={0.1}
                  className="slider small"
                  aria-label={`Weight ${type}`}
                  aria-valuetext={weight.toFixed(2)}
                  style={{
                    background: `linear-gradient(to right, color-mix(in srgb, ${color} 25%, transparent) 0%, ${color} ${fillPercent}%, var(--color-bg-tertiary) ${fillPercent}%, var(--color-bg-tertiary) 100%)`,
                  }}
                />
              </div>
            );
          })}
        </div>

        {/* Vertex Edge Pattern Legend */}
        <div className="control-item">
          <button
            type="button"
            className="legend-toggle"
            onClick={() => setShowLegend(!showLegend)}
            aria-expanded={showLegend}
          >
            <span>Vertex Edge Patterns</span>
            <span aria-hidden="true">{showLegend ? '▼' : '▶'}</span>
          </button>
          {showLegend && (
            <div className="legend-content">
              <VertexLegend showArrows={false} />
              <div className="legend-caption">Bold edges show the connected path segments</div>
            </div>
          )}
        </div>
      </div>

      {/* Visualization Settings */}
      <div className="control-section">
        <h3>
          <svg className="section-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
            />
          </svg>
          Visualization
        </h3>

        <div className="control-item">
          <label>
            <span>Display Mode</span>
            <select
              value={renderMode}
              onChange={(e) => onRenderModeChange(e.target.value as RenderMode)}
              className="select-input"
            >
              <option value={RenderMode.Paths}>Paths (Bold Edges)</option>
              <option value={RenderMode.Arrows}>Arrows</option>
              <option value={RenderMode.Both}>Paths + Arrows</option>
              <option value={RenderMode.Vertices}>Vertex Types</option>
            </select>
          </label>
        </div>

        <div className="checkbox-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={showGrid}
              onChange={(e) => onShowGridChange(e.target.checked)}
            />
            <span>Show Grid</span>
          </label>

          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={animateFlips}
              onChange={(e) => onAnimateFlipsChange(e.target.checked)}
            />
            <span>Animate Flips</span>
          </label>
        </div>

        <button onClick={onExportImage} className="control-button secondary full-width">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          Export Image
        </button>
      </div>
    </div>
  );
};

export default ControlPanel;
