import React, { useEffect, useRef, useMemo } from 'react';
import type { SimulationStats } from '../lib/six-vertex/types';
import { VertexType } from '../lib/six-vertex/types';
import './StatisticsPanel.css';

interface StatisticsPanelProps {
  stats: SimulationStats | null;
  fps: number;
}

const StatisticsPanel: React.FC<StatisticsPanelProps> = ({ stats, fps }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const vertexColors = useMemo(
    () => ({
      [VertexType.a1]: '#3B82F6',
      [VertexType.a2]: '#60A5FA',
      [VertexType.b1]: '#10B981',
      [VertexType.b2]: '#34D399',
      [VertexType.c1]: '#F59E0B',
      [VertexType.c2]: '#FCD34D',
    }),
    [],
  );

  // Draw vertex distribution chart
  useEffect(() => {
    try {
      if (!canvasRef.current || !stats) return;

      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Set canvas size
      const rect = canvas.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return; // Skip if not visible

      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

      // Clear canvas
      ctx.clearRect(0, 0, rect.width, rect.height);

      // Validate stats.vertexCounts exists and is an object
      if (!stats.vertexCounts || typeof stats.vertexCounts !== 'object') {
        console.warn('Invalid vertexCounts in stats:', stats);
        return;
      }

      // Calculate total vertices
      const vertexValues = Object.values(stats.vertexCounts).filter((v) => typeof v === 'number');
      if (vertexValues.length === 0) return;

      const total = vertexValues.reduce((sum, count) => sum + count, 0);
      if (total === 0) return;

      // Draw bars
      const barWidth = (rect.width - 60) / 6;
      const maxHeight = rect.height - 40;
      const maxCount = Math.max(...vertexValues);

      if (maxCount === 0) return; // Prevent division by zero

      Object.entries(stats.vertexCounts).forEach(([type, count], index) => {
        if (typeof count !== 'number') return;

        const percentage = count / total;
        const barHeight = (count / maxCount) * maxHeight;
        const x = 30 + index * barWidth;
        const y = rect.height - 20 - barHeight;

        // Draw bar
        ctx.fillStyle = vertexColors[type as VertexType] || '#999999';
        ctx.fillRect(x + barWidth * 0.1, y, barWidth * 0.8, barHeight);

        // Draw label
        ctx.fillStyle = '#374151';
        ctx.font = '11px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText(type, x + barWidth / 2, rect.height - 5);

        // Draw percentage
        ctx.fillStyle = '#6b7280';
        ctx.font = '10px system-ui';
        ctx.fillText(`${(percentage * 100).toFixed(1)}%`, x + barWidth / 2, y - 5);
      });

      // Draw axes
      ctx.strokeStyle = '#e5e7eb';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(25, 10);
      ctx.lineTo(25, rect.height - 20);
      ctx.lineTo(rect.width - 10, rect.height - 20);
      ctx.stroke();
    } catch (error) {
      console.error('Error drawing vertex distribution chart:', error);
    }
  }, [stats, vertexColors]);

  if (!stats) {
    return (
      <div className="statistics-panel">
        <div className="stats-section">
          <h3>
            <svg className="section-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
            Statistics
          </h3>
          <div className="stats-placeholder">
            <p>Run simulation to see statistics</p>
          </div>
        </div>
      </div>
    );
  }

  const formatNumber = (num: number | undefined) => {
    if (num === undefined || num === null) return '0';
    if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
    if (num >= 1e3) return `${(num / 1e3).toFixed(2)}K`;
    return num.toFixed(0);
  };

  return (
    <div className="statistics-panel">
      {/* Performance Metrics */}
      <div className="stats-section">
        <h3>
          <svg className="section-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 10V3L4 14h7v7l9-11h-7z"
            />
          </svg>
          Performance
        </h3>
        <div className="stats-grid">
          <div className="stat-item">
            <span className="stat-label">FPS</span>
            <span className="stat-value">{fps ? fps.toFixed(0) : '0'}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Steps</span>
            <span className="stat-value">{formatNumber(stats.step)}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Accept Rate</span>
            <span className="stat-value">
              {stats.acceptanceRate ? (stats.acceptanceRate * 100).toFixed(1) : '0.0'}%
            </span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Energy</span>
            <span className="stat-value">{stats.energy ? stats.energy.toFixed(2) : '0.00'}</span>
          </div>
        </div>
      </div>

      {/* Vertex Distribution */}
      <div className="stats-section">
        <h3>
          <svg className="section-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
          Vertex Distribution
        </h3>
        <canvas ref={canvasRef} className="distribution-chart" width={300} height={150} />
        <div className="vertex-legend">
          {stats.vertexCounts && typeof stats.vertexCounts === 'object'
            ? Object.entries(stats.vertexCounts).map(([type, count]) => (
                <div key={type} className="legend-item">
                  <span
                    className="legend-color"
                    style={{ backgroundColor: vertexColors[type as VertexType] || '#999999' }}
                  />
                  <span className="legend-label">{type}</span>
                  <span className="legend-value">{count || 0}</span>
                </div>
              ))
            : null}
        </div>
      </div>

      {/* Physical Properties */}
      {stats.height !== undefined && (
        <div className="stats-section">
          <h3>
            <svg className="section-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
            Physical Properties
          </h3>
          <div className="stats-grid">
            <div className="stat-item">
              <span className="stat-label">Height</span>
              <span className="stat-value">{stats.height?.toFixed(2) || 'N/A'}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Volume</span>
              <span className="stat-value">{stats.volume?.toFixed(2) || 'N/A'}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Delta (Δ)</span>
              <span className="stat-value">{stats.delta?.toFixed(4) || 'N/A'}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Entropy</span>
              <span className="stat-value">{stats.entropy?.toFixed(3) || 'N/A'}</span>
            </div>
          </div>
        </div>
      )}

      {/* Simulation Info */}
      <div className="stats-section">
        <h3>
          <svg className="section-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          Simulation Info
        </h3>
        <div className="info-list">
          <div className="info-item">
            <span className="info-label">Algorithm</span>
            <span className="info-value">Metropolis-Hastings</span>
          </div>
          <div className="info-item">
            <span className="info-label">Flip Type</span>
            <span className="info-value">Star-Triangle</span>
          </div>
          <div className="info-item">
            <span className="info-label">Temperature</span>
            <span className="info-value">
              {stats.beta && stats.beta !== 0 ? (1 / stats.beta).toFixed(2) : 'N/A'}
            </span>
          </div>
          <div className="info-item">
            <span className="info-label">Beta (β)</span>
            <span className="info-value">{stats.beta ? stats.beta.toFixed(3) : 'N/A'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatisticsPanel;
